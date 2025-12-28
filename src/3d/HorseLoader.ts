import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface HorseData {
  mesh: THREE.Mesh;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction | null;
  scene: THREE.Group;
}

export class HorseLoader {
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
  }

  async load(url: string): Promise<HorseData> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;
          let mesh: THREE.Mesh | null = null;

          // Find the mesh in the loaded scene
          scene.traverse((child) => {
            if (child instanceof THREE.Mesh && !mesh) {
              mesh = child;
              // Enable morph targets
              if (mesh.morphTargetInfluences) {
                console.log("Morph targets found:", mesh.morphTargetInfluences.length);
              }
            }
          });

          if (!mesh) {
            reject(new Error("No mesh found in GLTF"));
            return;
          }

          // Setup animation mixer on the mesh directly for morph targets
          const mixer = new THREE.AnimationMixer(mesh);
          let action: THREE.AnimationAction | null = null;

          // Play the first animation (gallop)
          if (gltf.animations.length > 0) {
            action = mixer.clipAction(gltf.animations[0]);
            action.setDuration(1); // Fast gallop
            action.play();
            console.log("Playing animation:", gltf.animations[0].name);
          }

          resolve({
            mesh,
            mixer,
            action,
            scene,
          });
        },
        (progress) => {
          if (progress.total > 0) {
            console.log("Loading:", Math.round((progress.loaded / progress.total) * 100), "%");
          }
        },
        (error) => {
          reject(error);
        },
      );
    });
  }

  /**
   * Load the default Three.js horse model
   */
  async loadDefaultHorse(): Promise<HorseData> {
    const url = "https://threejs.org/examples/models/gltf/Horse.glb";
    return this.load(url);
  }
}
