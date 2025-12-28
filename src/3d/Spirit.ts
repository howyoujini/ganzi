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
    this.simulator = new Simulator(this.renderer, 500 * 500);
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
    }
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
  }
}
