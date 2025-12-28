/**
 * Samples particle positions from an image
 * Particles are placed where the image has color (non-transparent/non-white pixels)
 */
export class ImageSampler {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;
  private width: number = 0;
  private height: number = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
  }

  async loadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.width = img.width;
        this.height = img.height;
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        this.imageData = this.ctx.getImageData(0, 0, img.width, img.height);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Sample positions from the image
   * @param count - Number of particles to sample
   * @param threshold - Color threshold (0-255), pixels darker than this are sampled
   * @param scale - Scale factor for positions
   * @returns Float32Array of positions (x, y, z, seed) for each particle
   */
  samplePositions(count: number, threshold: number = 128, scale: number = 100): Float32Array {
    if (!this.imageData) {
      throw new Error("Image not loaded");
    }

    const positions: { x: number; y: number; weight: number }[] = [];
    const data = this.imageData.data;

    // Collect all valid pixel positions
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Check if pixel is colored (not white/transparent)
        // For the red horse image: high red, low green/blue
        const brightness = (r + g + b) / 3;
        const isColored = a > 128 && (r > threshold || brightness < 200);

        if (isColored) {
          // Weight by color intensity for denser particles in darker areas
          const weight = 1 + (255 - brightness) / 255;
          positions.push({
            x: (x / this.width - 0.5) * 2,
            y: -(y / this.height - 0.5) * 2, // Flip Y
            weight,
          });
        }
      }
    }

    // Sample from collected positions
    const result = new Float32Array(count * 4);
    const totalWeight = positions.reduce((sum, p) => sum + p.weight, 0);

    for (let i = 0; i < count; i++) {
      let pos: { x: number; y: number; weight: number };

      if (positions.length > 0) {
        // Weighted random selection
        let r = Math.random() * totalWeight;
        let idx = 0;
        for (let j = 0; j < positions.length; j++) {
          r -= positions[j].weight;
          if (r <= 0) {
            idx = j;
            break;
          }
        }
        pos = positions[idx];
      } else {
        // Fallback to random sphere if no positions
        pos = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, weight: 1 };
      }

      // Add some random offset for organic feel
      const offsetX = (Math.random() - 0.5) * 0.02;
      const offsetY = (Math.random() - 0.5) * 0.02;
      const offsetZ = (Math.random() - 0.5) * 0.3; // Depth variation

      result[i * 4 + 0] = (pos.x + offsetX) * scale;
      result[i * 4 + 1] = (pos.y + offsetY) * scale;
      result[i * 4 + 2] = offsetZ * scale * 0.3;
      result[i * 4 + 3] = Math.random(); // Seed for life
    }

    return result;
  }
}

/**
 * Generate galloping horse shape positions
 * Based on the reference image of a running horse
 */
export function generateHorsePositions(count: number, scale: number = 50): Float32Array {
  const result = new Float32Array(count * 4);

  // Define horse body parts as weighted regions - galloping pose
  const bodyParts = [
    // Main body (barrel)
    { cx: 0, cy: 0.05, rx: 0.32, ry: 0.18, weight: 30 },
    { cx: -0.05, cy: 0.05, rx: 0.28, ry: 0.16, weight: 20 },

    // Chest (front of body)
    { cx: 0.22, cy: 0.08, rx: 0.14, ry: 0.17, weight: 12 },

    // Hindquarters (back of body)
    { cx: -0.22, cy: 0.06, rx: 0.16, ry: 0.19, weight: 14 },

    // Neck (angled upward for gallop)
    { cx: 0.35, cy: 0.22, rx: 0.1, ry: 0.18, weight: 10 },
    { cx: 0.4, cy: 0.28, rx: 0.08, ry: 0.14, weight: 8 },

    // Head
    { cx: 0.48, cy: 0.38, rx: 0.09, ry: 0.07, weight: 7 },
    { cx: 0.56, cy: 0.36, rx: 0.07, ry: 0.05, weight: 4 },

    // Snout/Nose
    { cx: 0.64, cy: 0.34, rx: 0.05, ry: 0.03, weight: 2 },

    // Ears
    { cx: 0.5, cy: 0.46, rx: 0.02, ry: 0.04, weight: 1 },
    { cx: 0.48, cy: 0.45, rx: 0.02, ry: 0.04, weight: 1 },

    // Front leg 1 - extended forward (galloping)
    { cx: 0.32, cy: -0.15, rx: 0.035, ry: 0.12, weight: 4 },
    { cx: 0.38, cy: -0.32, rx: 0.03, ry: 0.1, weight: 3 },
    { cx: 0.42, cy: -0.45, rx: 0.025, ry: 0.06, weight: 2 },

    // Front leg 2 - bent backward
    { cx: 0.12, cy: -0.12, rx: 0.035, ry: 0.1, weight: 4 },
    { cx: 0.08, cy: -0.28, rx: 0.03, ry: 0.12, weight: 3 },
    { cx: 0.05, cy: -0.42, rx: 0.025, ry: 0.06, weight: 2 },

    // Back leg 1 - pushing off (extended back)
    { cx: -0.28, cy: -0.08, rx: 0.04, ry: 0.12, weight: 5 },
    { cx: -0.38, cy: -0.22, rx: 0.035, ry: 0.14, weight: 4 },
    { cx: -0.48, cy: -0.38, rx: 0.03, ry: 0.1, weight: 3 },

    // Back leg 2 - bent forward
    { cx: -0.15, cy: -0.1, rx: 0.04, ry: 0.1, weight: 4 },
    { cx: -0.12, cy: -0.26, rx: 0.035, ry: 0.12, weight: 3 },
    { cx: -0.08, cy: -0.4, rx: 0.025, ry: 0.06, weight: 2 },

    // Tail - flowing behind
    { cx: -0.4, cy: 0.08, rx: 0.08, ry: 0.06, weight: 4 },
    { cx: -0.52, cy: 0.1, rx: 0.1, ry: 0.05, weight: 5 },
    { cx: -0.62, cy: 0.12, rx: 0.08, ry: 0.04, weight: 4 },
    { cx: -0.72, cy: 0.15, rx: 0.06, ry: 0.03, weight: 3 },

    // Mane - flowing
    { cx: 0.32, cy: 0.38, rx: 0.12, ry: 0.04, weight: 5 },
    { cx: 0.22, cy: 0.4, rx: 0.1, ry: 0.035, weight: 4 },
    { cx: 0.12, cy: 0.38, rx: 0.08, ry: 0.03, weight: 3 },
    { cx: 0.02, cy: 0.35, rx: 0.06, ry: 0.025, weight: 2 },

    // Scattered particles around body (dust/energy)
    { cx: 0, cy: 0, rx: 0.5, ry: 0.35, weight: 8, scatter: true },
  ];

  // Calculate total weight
  const totalWeight = bodyParts.reduce((sum, part) => sum + part.weight, 0);

  for (let i = 0; i < count; i++) {
    // Select body part based on weight
    let r = Math.random() * totalWeight;
    let selectedPart = bodyParts[0];

    for (const part of bodyParts) {
      r -= part.weight;
      if (r <= 0) {
        selectedPart = part;
        break;
      }
    }

    // Random point within ellipse
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random());

    let x = selectedPart.cx + Math.cos(angle) * radius * selectedPart.rx;
    let y = selectedPart.cy + Math.sin(angle) * radius * selectedPart.ry;
    let z = (Math.random() - 0.5) * 0.15;

    // For scatter particles, use lower density toward edges
    if ("scatter" in selectedPart) {
      const edgeFade = Math.pow(radius, 2);
      if (Math.random() > 0.3 * (1 - edgeFade)) {
        // Skip most scatter particles to create sparse effect
        x = selectedPart.cx + Math.cos(angle) * radius * selectedPart.rx * 1.2;
        y = selectedPart.cy + Math.sin(angle) * radius * selectedPart.ry * 1.2;
      }
    }

    result[i * 4 + 0] = x * scale;
    result[i * 4 + 1] = y * scale;
    result[i * 4 + 2] = z * scale;
    result[i * 4 + 3] = Math.random();
  }

  return result;
}
