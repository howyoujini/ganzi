import * as THREE from "three";

export class FBOHelper {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private mesh: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;

    // Fullscreen quad setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry);
    this.scene.add(this.mesh);
  }

  render(material: THREE.ShaderMaterial, renderTarget: THREE.WebGLRenderTarget | null): void {
    this.mesh.material = material;
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  createRenderTarget(
    width: number,
    height: number,
    options?: THREE.RenderTargetOptions,
  ): THREE.WebGLRenderTarget {
    const defaultOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    };

    return new THREE.WebGLRenderTarget(width, height, {
      ...defaultOptions,
      ...options,
    });
  }

  createDataTexture(data: Float32Array, width: number, height: number): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      data as unknown as BufferSource,
      width,
      height,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    texture.needsUpdate = true;
    return texture;
  }
}
