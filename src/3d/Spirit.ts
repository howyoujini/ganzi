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
    this.renderer.setClearColor(0xf5f5f5, 1);
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

    // Setup clock
    this.setupClock();

    // Start animation
    this.animate();
  }

  private setupClock(): void {
    this.clockElement = document.createElement("div");
    this.clockElement.style.cssText = `
      position: absolute;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 56px;
      font-weight: 300;
      color: #2a2a2a;
      letter-spacing: 8px;
      pointer-events: none;
      user-select: none;
      text-align: center;
    `;
    this.container.appendChild(this.clockElement);
    this.updateClock();
  }

  private updateClock(): void {
    if (!this.clockElement) return;
    const now = new Date();
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
    const day = now.getDate().toString().padStart(2, "0");
    const hour24 = now.getHours();
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hours = hour24.toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    this.clockElement.innerHTML = `
      <div style="font-size: 20px; letter-spacing: 6px; margin-bottom: 4px;">${year}</div>
      <div style="font-size: 28px; letter-spacing: 4px; margin-bottom: 12px;">${month} ${day}</div>
      <div>${hours}:${minutes}:${seconds} <span style="font-size: 24px;">${ampm}</span></div>
    `;
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
  }
}
