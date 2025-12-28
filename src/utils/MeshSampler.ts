import * as THREE from "three";

/**
 * Samples points from a mesh surface with morph target support
 */
export class MeshSampler {
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private positionAttribute: THREE.BufferAttribute;
  private morphAttributes: THREE.BufferAttribute[] = [];

  // Pre-computed face data for weighted random sampling
  private faceAreas: number[] = [];
  private totalArea: number = 0;
  private cumulativeAreas: number[] = [];

  constructor(mesh: THREE.Mesh) {
    this.mesh = mesh;
    this.geometry = mesh.geometry;

    const position = this.geometry.getAttribute("position");
    if (!position) {
      throw new Error("Geometry must have position attribute");
    }
    this.positionAttribute = position as THREE.BufferAttribute;

    // Get morph target attributes
    const morphPosition = this.geometry.morphAttributes.position;
    if (morphPosition) {
      this.morphAttributes = morphPosition as THREE.BufferAttribute[];
      console.log("MeshSampler: Found", this.morphAttributes.length, "morph targets");
    }

    this.computeFaceAreas();
  }

  private computeFaceAreas(): void {
    const index = this.geometry.index;
    const position = this.positionAttribute;

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();

    if (index) {
      // Indexed geometry
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i);
        const b = index.getX(i + 1);
        const c = index.getX(i + 2);

        vA.fromBufferAttribute(position, a);
        vB.fromBufferAttribute(position, b);
        vC.fromBufferAttribute(position, c);

        const area = this.triangleArea(vA, vB, vC);
        this.faceAreas.push(area);
        this.totalArea += area;
        this.cumulativeAreas.push(this.totalArea);
      }
    } else {
      // Non-indexed geometry
      for (let i = 0; i < position.count; i += 3) {
        vA.fromBufferAttribute(position, i);
        vB.fromBufferAttribute(position, i + 1);
        vC.fromBufferAttribute(position, i + 2);

        const area = this.triangleArea(vA, vB, vC);
        this.faceAreas.push(area);
        this.totalArea += area;
        this.cumulativeAreas.push(this.totalArea);
      }
    }
  }

  private triangleArea(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    return ab.cross(ac).length() * 0.5;
  }

  /**
   * Get vertex position with morph targets applied
   */
  private getMorphedVertex(vertexIndex: number, target: THREE.Vector3): THREE.Vector3 {
    // Start with base position
    target.fromBufferAttribute(this.positionAttribute, vertexIndex);

    // Apply morph target influences
    const influences = this.mesh.morphTargetInfluences;
    if (influences && this.morphAttributes.length > 0) {
      const morphOffset = new THREE.Vector3();

      for (let i = 0; i < this.morphAttributes.length; i++) {
        const influence = influences[i] || 0;
        if (influence === 0) continue;

        morphOffset.fromBufferAttribute(this.morphAttributes[i], vertexIndex);
        target.addScaledVector(morphOffset, influence);
      }
    }

    return target;
  }

  /**
   * Sample points from the morphed mesh surface
   */
  sampleMorphed(count: number): Float32Array {
    const positions = new Float32Array(count * 4);
    const index = this.geometry.index;

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const result = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      // Weighted random face selection based on area
      const r = Math.random() * this.totalArea;
      let faceIndex = this.cumulativeAreas.findIndex((area) => area >= r);
      if (faceIndex === -1) faceIndex = this.faceAreas.length - 1;

      // Get vertex indices
      let a: number, b: number, c: number;
      if (index) {
        a = index.getX(faceIndex * 3);
        b = index.getX(faceIndex * 3 + 1);
        c = index.getX(faceIndex * 3 + 2);
      } else {
        a = faceIndex * 3;
        b = faceIndex * 3 + 1;
        c = faceIndex * 3 + 2;
      }

      // Get morphed vertex positions
      this.getMorphedVertex(a, vA);
      this.getMorphedVertex(b, vB);
      this.getMorphedVertex(c, vC);

      // Random barycentric coordinates
      let u = Math.random();
      let v = Math.random();
      if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
      }
      const w = 1 - u - v;

      // Interpolate position
      result.set(0, 0, 0);
      result.addScaledVector(vA, w);
      result.addScaledVector(vB, u);
      result.addScaledVector(vC, v);

      positions[i * 4 + 0] = result.x;
      positions[i * 4 + 1] = result.y;
      positions[i * 4 + 2] = result.z;
      positions[i * 4 + 3] = Math.random(); // Life seed
    }

    return positions;
  }
}
