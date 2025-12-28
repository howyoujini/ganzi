import * as THREE from "three";
import { FBOHelper } from "./FBOHelper";
import { HorseLoader, HorseData } from "./HorseLoader";
import { MeshSampler } from "../utils/MeshSampler";

import throughVert from "../shaders/through.vert";
import positionFrag from "../shaders/position.frag";

export interface SimulatorSettings {
  speed: number;
  dieSpeed: number;
  radius: number;
  curlSize: number;
  attraction: number;
  amount: number;
}

export class Simulator {
  private fboHelper: FBOHelper;
  private size: number;

  private positionRenderTarget1: THREE.WebGLRenderTarget;
  private positionRenderTarget2: THREE.WebGLRenderTarget;
  private currentPositionRenderTarget: THREE.WebGLRenderTarget;

  private defaultPositionTexture: THREE.DataTexture;
  private positionMaterial: THREE.ShaderMaterial;

  private followPoint: THREE.Vector3 = new THREE.Vector3();
  private followPointTime: number = 0;
  private initAnimation: number = 0;

  // Horse animation
  private horseLoader: HorseLoader;
  private horseData: HorseData | null = null;
  private meshSampler: MeshSampler | null = null;
  private horseScene: THREE.Group = new THREE.Group();
  private isHorseLoaded: boolean = false;
  private frameCount: number = 0;
  private updateFrequency: number = 1; // Update every frame (no skip)

  public settings: SimulatorSettings;

  constructor(renderer: THREE.WebGLRenderer, amount: number = 256 * 256) {
    this.fboHelper = new FBOHelper(renderer);
    this.size = Math.ceil(Math.sqrt(amount));

    this.settings = {
      speed: 0.5,
      dieSpeed: 0.005,
      radius: 0.5,
      curlSize: 0.01,
      attraction: 2.6,
      amount: amount,
    };

    // Create render targets for ping-pong
    this.positionRenderTarget1 = this.fboHelper.createRenderTarget(this.size, this.size);
    this.positionRenderTarget2 = this.fboHelper.createRenderTarget(this.size, this.size);
    this.currentPositionRenderTarget = this.positionRenderTarget1;

    // Create default position texture (will be updated when horse loads)
    this.defaultPositionTexture = this.createDefaultPositionTexture();

    // Create position material
    this.positionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: new THREE.Vector2(this.size, this.size) },
        texturePosition: { value: null },
        textureDefaultPosition: { value: this.defaultPositionTexture },
        time: { value: 0 },
        speed: { value: this.settings.speed },
        dieSpeed: { value: this.settings.dieSpeed },
        radius: { value: this.settings.radius },
        curlSize: { value: this.settings.curlSize },
        attraction: { value: this.settings.attraction },
        initAnimation: { value: 0 },
        followPoint: { value: this.followPoint },
        mousePosition: { value: new THREE.Vector3() },
        mouseStrength: { value: 0 },
      },
      vertexShader: throughVert,
      fragmentShader: positionFrag,
    });

    // Initialize position texture
    this.initPositionTexture();

    // Load horse model
    this.horseLoader = new HorseLoader();
    this.loadHorse();
  }

  private async loadHorse(): Promise<void> {
    try {
      console.log("Loading horse model...");
      this.horseData = await this.horseLoader.loadDefaultHorse();

      // Create mesh sampler from the loaded mesh
      this.meshSampler = new MeshSampler(this.horseData.mesh);

      // Setup horse scene
      this.horseScene.add(this.horseData.scene);
      this.horseScene.scale.setScalar(0.5);
      this.horseScene.rotation.y = Math.PI / 2; // Face right
      this.horseScene.position.set(0, -30, 0);
      this.horseScene.visible = false;

      // Initial sample
      this.updateHorsePositions();
      this.isHorseLoaded = true;
      this.initAnimation = 0;

      console.log("Horse model loaded successfully!");
    } catch (error) {
      console.error("Failed to load horse model:", error);
    }
  }

  private updateHorsePositions(): void {
    if (!this.meshSampler || !this.horseData) return;

    const count = this.size * this.size;

    // Sample from morphed mesh (animation applied)
    const positions = this.meshSampler.sampleMorphed(count);

    // Apply scene transforms
    this.horseScene.updateMatrixWorld(true);
    const matrix = new THREE.Matrix4();
    matrix.multiplyMatrices(this.horseScene.matrixWorld, this.horseData.mesh.matrixWorld);

    const tempVec = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      tempVec.set(positions[i * 4 + 0], positions[i * 4 + 1], positions[i * 4 + 2]);
      tempVec.applyMatrix4(matrix);
      positions[i * 4 + 0] = tempVec.x;
      positions[i * 4 + 1] = tempVec.y;
      positions[i * 4 + 2] = tempVec.z;
    }

    // Reuse existing texture instead of creating new one
    const textureData = this.defaultPositionTexture.image.data as unknown as Float32Array;
    textureData.set(positions);
    this.defaultPositionTexture.needsUpdate = true;
  }

  private createDefaultPositionTexture(): THREE.DataTexture {
    const data = new Float32Array(this.size * this.size * 4);

    for (let i = 0; i < this.size * this.size; i++) {
      // Spherical distribution as default
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const radius = 50 * Math.cbrt(Math.random());

      data[i * 4 + 0] = radius * Math.sin(theta) * Math.cos(phi);
      data[i * 4 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      data[i * 4 + 2] = radius * Math.cos(theta);
      data[i * 4 + 3] = Math.random();
    }

    return this.fboHelper.createDataTexture(data, this.size, this.size);
  }

  private initPositionTexture(): void {
    const copyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.defaultPositionTexture },
        resolution: { value: new THREE.Vector2(this.size, this.size) },
      },
      vertexShader: throughVert,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          gl_FragColor = texture2D(tDiffuse, uv);
        }
      `,
    });

    this.fboHelper.render(copyMaterial, this.positionRenderTarget1);
    this.fboHelper.render(copyMaterial, this.positionRenderTarget2);
    copyMaterial.dispose();
  }

  get positionTexture(): THREE.Texture {
    return this.currentPositionRenderTarget.texture;
  }

  get textureSize(): number {
    return this.size;
  }

  get scene(): THREE.Group {
    return this.horseScene;
  }

  setFollowPoint(x: number, y: number, z: number): void {
    this.followPoint.set(x, y, z);
  }

  setMousePosition(x: number, y: number, z: number, strength: number): void {
    this.positionMaterial.uniforms.mousePosition.value.set(x, y, z);
    this.positionMaterial.uniforms.mouseStrength.value = strength;
  }

  update(dt: number, time: number): void {
    this.frameCount++;

    // Update horse animation
    if (this.horseData && this.horseData.mixer) {
      this.horseData.mixer.update(dt);

      // Update particle positions from animated mesh (skip frames for performance)
      if (this.isHorseLoaded && this.frameCount % this.updateFrequency === 0) {
        this.updateHorsePositions();
      }
    }

    // Update init animation
    this.initAnimation = Math.min(1, this.initAnimation + dt * 0.5);

    // Keep follow point at origin for horse shape
    if (this.isHorseLoaded) {
      this.followPoint.set(0, 0, 0);
    } else {
      // Auto-rotate for sphere mode
      this.followPointTime += dt * 0.3;
      const autoX = Math.cos(this.followPointTime) * 30;
      const autoY = Math.sin(this.followPointTime * 0.7) * 20;
      const autoZ = Math.sin(this.followPointTime * 0.5) * 30;

      this.followPoint.x += (autoX - this.followPoint.x) * 0.02;
      this.followPoint.y += (autoY - this.followPoint.y) * 0.02;
      this.followPoint.z += (autoZ - this.followPoint.z) * 0.02;
    }

    // Swap render targets
    const temp = this.currentPositionRenderTarget;
    this.currentPositionRenderTarget =
      this.currentPositionRenderTarget === this.positionRenderTarget1
        ? this.positionRenderTarget2
        : this.positionRenderTarget1;

    // Update uniforms
    this.positionMaterial.uniforms.texturePosition.value = temp.texture;
    this.positionMaterial.uniforms.time.value = time;
    this.positionMaterial.uniforms.speed.value = this.settings.speed;
    this.positionMaterial.uniforms.dieSpeed.value = this.settings.dieSpeed;
    this.positionMaterial.uniforms.radius.value = this.settings.radius;
    this.positionMaterial.uniforms.curlSize.value = this.settings.curlSize;
    this.positionMaterial.uniforms.attraction.value = this.settings.attraction;
    this.positionMaterial.uniforms.initAnimation.value = this.initAnimation;
    this.positionMaterial.uniforms.followPoint.value = this.followPoint;

    // Render new positions
    this.fboHelper.render(this.positionMaterial, this.currentPositionRenderTarget);
  }

  dispose(): void {
    this.positionRenderTarget1.dispose();
    this.positionRenderTarget2.dispose();
    this.defaultPositionTexture.dispose();
    this.positionMaterial.dispose();
  }
}
