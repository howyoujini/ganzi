import * as THREE from "three";
import particlesFrag from "../shaders/particles.frag";

import particlesVert from "../shaders/particles.vert";
import type { Simulator } from "./Simulator";

export interface ParticlesSettings {
  color1: THREE.Color;
  color2: THREE.Color;
  color3: THREE.Color;
  hoverColor: THREE.Color;
  pointSize: number;
}

export class Particles {
  public mesh: THREE.Points;
  public settings: ParticlesSettings;

  private material: THREE.ShaderMaterial;
  private simulator: Simulator;

  constructor(simulator: Simulator) {
    this.simulator = simulator;

    this.settings = {
      color1: new THREE.Color(0x8b160e), // Dark red
      color2: new THREE.Color(0xee2311), // Mid red
      color3: new THREE.Color(0xff245b), // Bright orange-red
      hoverColor: new THREE.Color(0xffdd44), // Golden yellow on hover
      pointSize: 1.6,
    };

    // Create geometry with UV coordinates for texture lookup
    const geometry = this.createGeometry(simulator.textureSize);

    // Create material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        texturePosition: { value: simulator.positionTexture },
        color1: { value: this.settings.color1 },
        color2: { value: this.settings.color2 },
        color3: { value: this.settings.color3 },
        hoverColor: { value: this.settings.hoverColor },
        pointSize: { value: this.settings.pointSize },
        mousePosition: { value: new THREE.Vector3() },
        mouseStrength: { value: 0 },
      },
      vertexShader: particlesVert,
      fragmentShader: particlesFrag,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: true,
    });

    this.mesh = new THREE.Points(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  private createGeometry(size: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(size * size * 3);

    // Each vertex position is actually UV coordinates for texture lookup
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 3;
        positions[index + 0] = (j + 0.5) / size; // u
        positions[index + 1] = (i + 0.5) / size; // v
        positions[index + 2] = 0;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    return geometry;
  }

  update(): void {
    // Update texture from simulator
    this.material.uniforms.texturePosition.value = this.simulator.positionTexture;
    this.material.uniforms.color1.value = this.settings.color1;
    this.material.uniforms.color2.value = this.settings.color2;
    this.material.uniforms.color3.value = this.settings.color3;
    this.material.uniforms.hoverColor.value = this.settings.hoverColor;
    this.material.uniforms.pointSize.value = this.settings.pointSize;
  }

  setMousePosition(x: number, y: number, z: number, strength: number): void {
    this.material.uniforms.mousePosition.value.set(x, y, z);
    this.material.uniforms.mouseStrength.value = strength;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
