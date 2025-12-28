import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Particles } from "./Particles";
import { Simulator } from "./Simulator";

export class Spirit {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  private simulator: Simulator;
  private particles: Particles;

  private clock: THREE.Clock;

  private mouse: THREE.Vector2 = new THREE.Vector2();
  private mouse3d: THREE.Vector3 = new THREE.Vector3();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private followMouse: boolean = true;
  private clockElement: HTMLElement | null = null;
  private timeElement: HTMLElement | null = null;
  private currentDay: number = -1;
  private currentSecond: number = -1;
  private isDarkMode: boolean = false;
  private modeToggleButton: HTMLElement | null = null;
  private progressBarContainer: HTMLElement | null = null;
  private horseIndicator: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0xffffff, 1);
    container.appendChild(this.renderer.domElement);

    // Check for required extensions
    const gl = this.renderer.getContext();
    if (!gl.getExtension("OES_texture_float")) {
      console.warn("OES_texture_float not supported");
    }

    // Setup scene
    this.scene = new THREE.Scene();

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      10000,
    );
    this.camera.position.set(0, 0, 150);

    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 200;
    // Lock vertical rotation - only allow horizontal
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;
    // Limit horizontal rotation
    this.controls.minAzimuthAngle = Math.PI / 3; // 60°
    this.controls.maxAzimuthAngle = (Math.PI * 2) / 3; // 120°

    // Setup simulator and particles (optimized particle count)
    this.simulator = new Simulator(this.renderer, 550 * 550);
    this.particles = new Particles(this.simulator);
    this.scene.add(this.particles.mesh);

    // Setup post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.6, // strength - reduced
      0.3, // radius
      0.85, // threshold - higher to bloom only bright areas
    );
    this.composer.addPass(this.bloomPass);

    // Events
    this.setupEvents();

    // 초기 뷰포트에 맞게 카메라 설정
    this.updateCameraForViewport(container.clientWidth, container.clientHeight);

    // Setup clock
    this.setupClock();

    // Setup mode toggle
    this.setupModeToggle();

    // Setup progress bar
    this.setupProgressBar();

    // Start animation
    this.animate();
  }

  private setupClock(): void {
    this.clockElement = document.createElement("div");
    this.clockElement.style.cssText = `
      position: absolute;
      top: clamp(16px, 5%, 10%);
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: clamp(32px, 8vw, 56px);
      font-weight: 300;
      color: #2a2a2a;
      letter-spacing: clamp(4px, 1vw, 8px);
      pointer-events: none;
      user-select: none;
      text-align: center;
      width: 90%;
      max-width: 600px;
    `;

    // 시간 표시 엘리먼트 (매 프레임 업데이트)
    this.timeElement = document.createElement("div");
    this.timeElement.style.cssText = `
      font-size: clamp(48px, 12vw, 100px);
      font-weight: 500;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: clamp(4px, 1vw, 10px) 0;
    `;

    this.clockElement.appendChild(this.timeElement);
    this.container.appendChild(this.clockElement);

    this.updateDate();
    this.updateTime();
  }

  private updateDate(): void {
    if (!this.clockElement || !this.timeElement) return;

    const now = new Date();
    const day = now.getDate();

    // 날짜가 바뀌었을 때만 업데이트
    if (this.currentDay === day) return;
    this.currentDay = day;

    const year = now.getFullYear();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[now.getMonth()];
    const dayStr = day.toString().padStart(2, "0");

    // 날짜 엘리먼트들을 timeElement 앞에 삽입
    const dateHTML = `
      <div style="font-size: clamp(14px, 3vw, 24px); letter-spacing: clamp(3px, 0.8vw, 6px); margin-bottom: clamp(2px, 0.5vw, 4px);">${year}</div>
      <div style="font-size: clamp(20px, 5vw, 36px); letter-spacing: clamp(2px, 0.5vw, 4px); margin-bottom: clamp(6px, 1.5vw, 12px);">${month} ${dayStr}</div>
    `;

    // 기존 날짜 엘리먼트 제거 후 새로 추가
    const existingDateElements = this.clockElement.querySelectorAll("div:not(:last-child)");
    existingDateElements.forEach((el) => {
      el.remove();
    });
    this.timeElement.insertAdjacentHTML("beforebegin", dateHTML);
  }

  private updateTime(): void {
    if (!this.timeElement) return;

    const now = new Date();
    const seconds = now.getSeconds();

    // 초가 바뀌었을 때만 업데이트
    if (this.currentSecond === seconds) return;
    this.currentSecond = seconds;

    const hour24 = now.getHours();
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hours = hour24.toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const secondsStr = seconds.toString().padStart(2, "0");

    this.timeElement.innerHTML = `${hours}:${minutes}:${secondsStr} <span style="font-size: clamp(16px, 4vw, 28px); font-weight: 400;">${ampm}</span>`;
  }

  private updateClock(): void {
    this.updateDate();
    this.updateTime();
  }

  private setupModeToggle(): void {
    this.modeToggleButton = document.createElement("button");
    this.modeToggleButton.textContent = "Dark";
    this.modeToggleButton.style.cssText = `
      position: absolute;
      top: clamp(12px, 3vw, 24px);
      right: clamp(12px, 3vw, 24px);
      padding: clamp(10px, 2vw, 12px) clamp(16px, 4vw, 24px);
      min-width: 44px;
      min-height: 44px;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: clamp(14px, 2.5vw, 16px);
      font-weight: 500;
      letter-spacing: clamp(1px, 0.3vw, 2px);
      border: 1px solid #2a2a2a;
      background: transparent;
      color: #2a2a2a;
      cursor: pointer;
      transition: all 0.3s ease;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    `;
    this.modeToggleButton.addEventListener("click", () => this.toggleMode());
    this.container.appendChild(this.modeToggleButton);
  }

  private setupProgressBar(): void {
    this.progressBarContainer = document.createElement("div");
    this.progressBarContainer.style.cssText = `
      position: absolute;
      bottom: clamp(20px, 2vh, 80px);
      left: 0;
      width: 100%;
      pointer-events: none;
      user-select: none;
    `;

    // Progress bar track (wider to allow scrolling effect)
    const track = document.createElement("div");
    track.className = "progress-track";
    track.style.cssText = `
      position: relative;
      width: 300%;
      left: -100%;
      height: 2px;
      background: #e6e6e6;
      border-radius: 1px;
      transition: transform 0.5s ease-out;
    `;

    // Date markers container (matches track width)
    const markersContainer = document.createElement("div");
    markersContainer.className = "progress-markers";
    markersContainer.style.cssText = `
      position: relative;
      width: 300%;
      left: -100%;
      height: 30px;
      margin-top: 12px;
      transition: transform 0.5s ease-out;
    `;

    // Create date labels (9 days to fill 300% width)
    const now = new Date();
    const formatDate = (date: Date): string => {
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${month}.${day}`;
    };

    const daySpacingPercent = 100 / 9; // 11.11%

    for (let i = -4; i <= 4; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const labelText = i === 0 ? "Today" : formatDate(date);
      const dayIndex = i + 4; // Convert -4~4 to 0~8
      const position = dayIndex * daySpacingPercent; // Position at 0:00 of each day

      const marker = document.createElement("div");
      marker.style.cssText = `
        position: absolute;
        left: ${position}%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
      `;

      // Tick mark (positioned to cross the track line, centered on it)
      const tick = document.createElement("div");
      tick.className = "progress-tick";
      tick.style.cssText = `
        position: absolute;
        top: -17px;
        width: 2px;
        height: 10px;
        background: #aaa;
      `;

      // Label
      const label = document.createElement("div");
      label.className = "progress-date-label";
      label.textContent = labelText;
      label.style.cssText = `
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: clamp(12px, 2.5vw, 16px);
        font-weight: 400;
        color: #2a2a2a;
        letter-spacing: 1px;
        white-space: nowrap;
        margin-top: 8px;
        ${i === 0 ? "font-weight: 500;" : ""}
      `;

      marker.appendChild(tick);
      marker.appendChild(label);
      markersContainer.appendChild(marker);
    }

    // Time markers across the entire progress bar (300% width)
    // Will be hidden on mobile via updateTimeMarkersVisibility
    const daySpacing = 100 / 9; // 11.11%
    const hours = [0, 3, 6, 9, 12, 15, 18, 21];

    // Helper to create time marker
    const createTimeMarker = (position: number, label: string) => {
      const timeMarker = document.createElement("div");
      timeMarker.className = "time-marker";
      timeMarker.style.cssText = `
        position: absolute;
        left: ${position}%;
        top: 4px;
        transform: translateX(-50%);
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: clamp(11px, 2vw, 14px);
        color: #999;
        white-space: nowrap;
      `;
      timeMarker.textContent = label;
      track.appendChild(timeMarker);
    };

    // Add time markers for each day (9 days, indices 0-8, today is index 4)
    for (let dayIndex = 0; dayIndex < 9; dayIndex++) {
      const dayStart = dayIndex * daySpacing; // Start of day section
      const dayEnd = (dayIndex + 1) * daySpacing; // End of day section

      hours.forEach((hour) => {
        const progress = hour / 24;
        const position = dayStart + progress * (dayEnd - dayStart);
        createTimeMarker(position, `${hour.toString().padStart(2, "0")}`);
      });
    }

    // Add opacity animation keyframes
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes horsePulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);

    // Horse indicator (fixed at center of container)
    this.horseIndicator = document.createElement("div");
    this.horseIndicator.style.cssText = `
      position: absolute;
      left: 50%;
      top: -10px;
      width: 20px;
      height: 20px;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      animation: horsePulse 1.5s ease-in-out infinite;
    `;

    // Horse icon (simple running circle)
    this.horseIndicator.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="6" fill="#cc1100"/>
      </svg>
    `;

    this.progressBarContainer.appendChild(track);
    this.progressBarContainer.appendChild(markersContainer);
    this.progressBarContainer.appendChild(this.horseIndicator);
    this.container.appendChild(this.progressBarContainer);

    // Initial position update
    this.updateProgressBar();
    this.updateTimeMarkersVisibility();
  }

  private updateTimeMarkersVisibility(): void {
    if (!this.progressBarContainer) return;

    const isMobile = window.innerWidth < 768;
    const timeMarkers = this.progressBarContainer.querySelectorAll(".time-marker");
    timeMarkers.forEach((tm) => {
      (tm as HTMLElement).style.display = isMobile ? "none" : "block";
    });
  }

  private updateProgressBar(): void {
    if (!this.progressBarContainer) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Calculate progress through the day (0 to 1)
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const dayProgress = totalSeconds / 86400; // 86400 seconds in a day

    // With 9 days on 300% track, each day spans 11.11%
    // Today (index 4) starts at 44.44% of the track
    const daySpacing = 100 / 9; // 11.11%
    const todayStart = 4 * daySpacing; // 44.44%
    const currentPosition = todayStart + dayProgress * daySpacing;

    // Translate track so current position is at center (50%)
    // translateX = (50 - currentPosition)% of track width
    const translateX = 50 - currentPosition;

    const track = this.progressBarContainer.querySelector(".progress-track") as HTMLElement;
    const markers = this.progressBarContainer.querySelector(".progress-markers") as HTMLElement;

    if (track) {
      track.style.transform = `translateX(${translateX}%)`;
    }
    if (markers) {
      markers.style.transform = `translateX(${translateX}%)`;
    }
  }

  private toggleMode(): void {
    this.isDarkMode = !this.isDarkMode;

    if (this.isDarkMode) {
      // Dark mode
      this.renderer.setClearColor(0x1a1a1a, 1);
      if (this.clockElement) {
        this.clockElement.style.color = "#f5f5f5";
      }
      if (this.modeToggleButton) {
        this.modeToggleButton.textContent = "Light";
        this.modeToggleButton.style.borderColor = "#f5f5f5";
        this.modeToggleButton.style.color = "#f5f5f5";
      }
      this.updateProgressBarColors("#f5f5f5", "#666");
    } else {
      // Light mode
      this.renderer.setClearColor(0xffffff, 1);
      if (this.clockElement) {
        this.clockElement.style.color = "#2a2a2a";
      }
      if (this.modeToggleButton) {
        this.modeToggleButton.textContent = "Dark";
        this.modeToggleButton.style.borderColor = "#2a2a2a";
        this.modeToggleButton.style.color = "#2a2a2a";
      }
      this.updateProgressBarColors("#2a2a2a", "#ccc");
    }
  }

  private updateProgressBarColors(textColor: string, trackColor: string): void {
    if (!this.progressBarContainer) return;

    const track = this.progressBarContainer.querySelector("div") as HTMLElement;
    if (track) {
      track.style.background = trackColor;
    }

    const labels = this.progressBarContainer.querySelectorAll(".progress-date-label");
    labels.forEach((label) => {
      (label as HTMLElement).style.color = textColor;
    });

    const ticks = this.progressBarContainer.querySelectorAll(".progress-tick");
    ticks.forEach((tick) => {
      (tick as HTMLElement).style.background = trackColor;
    });

    const timeMarkers = this.progressBarContainer.querySelectorAll(".time-marker");
    timeMarkers.forEach((tm) => {
      (tm as HTMLElement).style.color = this.isDarkMode ? "#777" : "#999";
    });
  }

  private setupEvents(): void {
    window.addEventListener("resize", this.onResize.bind(this));
    this.renderer.domElement.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener("mouseleave", this.onMouseLeave.bind(this));
    this.renderer.domElement.addEventListener("touchmove", this.onTouchMove.bind(this), {
      passive: false,
    });
    this.renderer.domElement.addEventListener("touchend", this.onTouchEnd.bind(this));
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);

    // 모바일에서 카메라 거리 조절 (세로 모드일 때 더 멀리)
    this.updateCameraForViewport(width, height);

    // 시간 마커 표시 여부 업데이트
    this.updateTimeMarkersVisibility();
  }

  private updateCameraForViewport(width: number, height: number): void {
    const isMobile = width < 768;
    const isPortrait = height > width;

    if (isMobile && isPortrait) {
      // 모바일 세로 모드: 카메라를 더 멀리 배치
      this.controls.minDistance = 150;
      this.controls.maxDistance = 250;
      this.camera.position.z = Math.max(this.camera.position.z, 180);
    } else if (isMobile) {
      // 모바일 가로 모드
      this.controls.minDistance = 120;
      this.controls.maxDistance = 220;
    } else {
      // 데스크톱
      this.controls.minDistance = 100;
      this.controls.maxDistance = 200;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.updateMouse3d();
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

    this.updateMouse3d();
  }

  private onMouseLeave(): void {
    this.particles.setMousePosition(0, 0, 0, 0);
  }

  private onTouchEnd(): void {
    this.particles.setMousePosition(0, 0, 0, 0);
  }

  private updateMouse3d(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Project to a plane at z=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.raycaster.ray.intersectPlane(plane, this.mouse3d);

    if (this.mouse3d) {
      // Mouse interaction for particle color change
      this.particles.setMousePosition(this.mouse3d.x, this.mouse3d.y, this.mouse3d.z, 1.0);

      if (this.followMouse) {
        this.simulator.setFollowPoint(this.mouse3d.x, this.mouse3d.y, this.mouse3d.z);
      }
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Update controls
    this.controls.update();

    // Update simulation
    this.simulator.update(dt, time);

    // Update particles
    this.particles.update();

    // Update clock
    this.updateClock();

    // Update progress bar
    this.updateProgressBar();

    // Render with post-processing
    this.composer.render();
  };

  destroy(): void {
    this.simulator.dispose();
    this.particles.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    if (this.clockElement) {
      this.container.removeChild(this.clockElement);
    }
    if (this.modeToggleButton) {
      this.container.removeChild(this.modeToggleButton);
    }
    if (this.progressBarContainer) {
      this.container.removeChild(this.progressBarContainer);
    }
  }
}
