/**
 * Detailed galloping horse shape generator
 * Creates particle positions that form a realistic horse silhouette
 */

interface BodyPart {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  weight: number;
  rotation?: number; // Rotation angle in radians
  density?: number; // Particle density multiplier
}

// Seeded random for consistent shapes
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateDetailedHorse(count: number, scale: number = 80): Float32Array {
  const result = new Float32Array(count * 4);
  const rand = seededRandom(42);

  // Detailed horse anatomy - galloping pose facing right
  const bodyParts: BodyPart[] = [
    // === TORSO (Dense core) ===
    { cx: 0, cy: 0, rx: 0.28, ry: 0.16, weight: 25, density: 1.2 },
    { cx: 0.05, cy: 0.02, rx: 0.26, ry: 0.14, weight: 20, density: 1.3 },
    { cx: -0.05, cy: 0.02, rx: 0.24, ry: 0.14, weight: 18, density: 1.2 },

    // Chest (front bulge)
    { cx: 0.2, cy: 0.04, rx: 0.12, ry: 0.15, weight: 12, density: 1.2 },
    { cx: 0.24, cy: 0.06, rx: 0.1, ry: 0.13, weight: 10, density: 1.1 },

    // Hindquarters (back bulge)
    { cx: -0.18, cy: 0.02, rx: 0.14, ry: 0.16, weight: 14, density: 1.2 },
    { cx: -0.22, cy: 0.04, rx: 0.12, ry: 0.14, weight: 12, density: 1.1 },

    // Belly
    { cx: 0, cy: -0.08, rx: 0.22, ry: 0.08, weight: 8, density: 0.9 },

    // Back line
    { cx: 0, cy: 0.12, rx: 0.24, ry: 0.04, weight: 6, density: 1.0 },

    // === NECK ===
    { cx: 0.32, cy: 0.12, rx: 0.08, ry: 0.14, weight: 10, density: 1.1 },
    { cx: 0.36, cy: 0.18, rx: 0.07, ry: 0.12, weight: 9, density: 1.1 },
    { cx: 0.4, cy: 0.24, rx: 0.06, ry: 0.1, weight: 8, density: 1.0 },
    { cx: 0.43, cy: 0.3, rx: 0.055, ry: 0.08, weight: 7, density: 1.0 },

    // Neck underside
    { cx: 0.3, cy: 0.06, rx: 0.06, ry: 0.08, weight: 5, density: 0.9 },
    { cx: 0.34, cy: 0.1, rx: 0.05, ry: 0.07, weight: 4, density: 0.9 },

    // === HEAD ===
    { cx: 0.48, cy: 0.36, rx: 0.07, ry: 0.06, weight: 8, density: 1.2 },
    { cx: 0.52, cy: 0.35, rx: 0.06, ry: 0.05, weight: 6, density: 1.1 },
    { cx: 0.56, cy: 0.34, rx: 0.05, ry: 0.04, weight: 5, density: 1.0 },

    // Snout/Muzzle
    { cx: 0.6, cy: 0.32, rx: 0.04, ry: 0.03, weight: 4, density: 1.0 },
    { cx: 0.64, cy: 0.31, rx: 0.03, ry: 0.025, weight: 3, density: 0.9 },
    { cx: 0.67, cy: 0.3, rx: 0.02, ry: 0.02, weight: 2, density: 0.8 },

    // Jaw line
    { cx: 0.5, cy: 0.32, rx: 0.05, ry: 0.03, weight: 3, density: 0.9 },

    // Forehead
    { cx: 0.47, cy: 0.4, rx: 0.04, ry: 0.04, weight: 4, density: 1.0 },

    // Ears
    { cx: 0.48, cy: 0.44, rx: 0.015, ry: 0.035, weight: 2, density: 1.2 },
    { cx: 0.46, cy: 0.43, rx: 0.015, ry: 0.03, weight: 2, density: 1.1 },

    // === FRONT LEG 1 (Extended forward) ===
    // Upper leg (shoulder to knee)
    { cx: 0.26, cy: -0.06, rx: 0.04, ry: 0.08, weight: 5, density: 1.0 },
    { cx: 0.3, cy: -0.14, rx: 0.035, ry: 0.07, weight: 4, density: 1.0 },
    { cx: 0.34, cy: -0.22, rx: 0.03, ry: 0.06, weight: 4, density: 0.95 },
    // Lower leg (knee to hoof)
    { cx: 0.38, cy: -0.3, rx: 0.025, ry: 0.06, weight: 3, density: 0.9 },
    { cx: 0.41, cy: -0.38, rx: 0.022, ry: 0.05, weight: 3, density: 0.85 },
    // Hoof
    { cx: 0.44, cy: -0.45, rx: 0.025, ry: 0.03, weight: 2, density: 1.0 },

    // === FRONT LEG 2 (Bent back, under body) ===
    // Upper leg
    { cx: 0.14, cy: -0.08, rx: 0.035, ry: 0.07, weight: 4, density: 0.95 },
    { cx: 0.12, cy: -0.16, rx: 0.03, ry: 0.06, weight: 3, density: 0.9 },
    // Lower leg (bent)
    { cx: 0.08, cy: -0.24, rx: 0.028, ry: 0.06, weight: 3, density: 0.85 },
    { cx: 0.05, cy: -0.32, rx: 0.025, ry: 0.05, weight: 3, density: 0.8 },
    // Hoof
    { cx: 0.03, cy: -0.4, rx: 0.022, ry: 0.025, weight: 2, density: 0.9 },

    // === BACK LEG 1 (Extended back, pushing off) ===
    // Hip/Upper leg
    { cx: -0.22, cy: -0.04, rx: 0.05, ry: 0.09, weight: 6, density: 1.0 },
    { cx: -0.28, cy: -0.1, rx: 0.04, ry: 0.08, weight: 5, density: 0.95 },
    // Lower leg
    { cx: -0.34, cy: -0.18, rx: 0.035, ry: 0.07, weight: 4, density: 0.9 },
    { cx: -0.4, cy: -0.26, rx: 0.03, ry: 0.06, weight: 4, density: 0.85 },
    { cx: -0.46, cy: -0.34, rx: 0.025, ry: 0.05, weight: 3, density: 0.8 },
    // Hoof
    { cx: -0.5, cy: -0.42, rx: 0.025, ry: 0.03, weight: 2, density: 0.9 },

    // === BACK LEG 2 (Bent forward, under body) ===
    // Hip/Upper leg
    { cx: -0.12, cy: -0.06, rx: 0.04, ry: 0.08, weight: 5, density: 0.95 },
    { cx: -0.1, cy: -0.14, rx: 0.035, ry: 0.07, weight: 4, density: 0.9 },
    // Lower leg
    { cx: -0.06, cy: -0.22, rx: 0.03, ry: 0.06, weight: 3, density: 0.85 },
    { cx: -0.02, cy: -0.3, rx: 0.025, ry: 0.05, weight: 3, density: 0.8 },
    // Hoof
    { cx: 0.02, cy: -0.38, rx: 0.022, ry: 0.025, weight: 2, density: 0.85 },

    // === TAIL (Flowing) ===
    { cx: -0.3, cy: 0.06, rx: 0.06, ry: 0.05, weight: 4, density: 0.9 },
    { cx: -0.38, cy: 0.08, rx: 0.07, ry: 0.04, weight: 5, density: 0.8 },
    { cx: -0.48, cy: 0.1, rx: 0.08, ry: 0.035, weight: 5, density: 0.7 },
    { cx: -0.58, cy: 0.12, rx: 0.07, ry: 0.03, weight: 4, density: 0.6 },
    { cx: -0.68, cy: 0.14, rx: 0.06, ry: 0.025, weight: 3, density: 0.5 },
    { cx: -0.76, cy: 0.16, rx: 0.05, ry: 0.02, weight: 2, density: 0.4 },

    // Tail wisps (scattered)
    { cx: -0.5, cy: 0.06, rx: 0.06, ry: 0.025, weight: 2, density: 0.5 },
    { cx: -0.6, cy: 0.08, rx: 0.05, ry: 0.02, weight: 2, density: 0.4 },
    { cx: -0.55, cy: 0.14, rx: 0.05, ry: 0.02, weight: 2, density: 0.4 },

    // === MANE (Flowing from neck/head) ===
    { cx: 0.38, cy: 0.32, rx: 0.08, ry: 0.03, weight: 4, density: 0.8 },
    { cx: 0.32, cy: 0.34, rx: 0.07, ry: 0.025, weight: 4, density: 0.7 },
    { cx: 0.26, cy: 0.35, rx: 0.06, ry: 0.022, weight: 3, density: 0.6 },
    { cx: 0.2, cy: 0.34, rx: 0.05, ry: 0.02, weight: 3, density: 0.5 },
    { cx: 0.14, cy: 0.32, rx: 0.04, ry: 0.018, weight: 2, density: 0.45 },
    { cx: 0.08, cy: 0.3, rx: 0.035, ry: 0.015, weight: 2, density: 0.4 },

    // Mane wisps
    { cx: 0.3, cy: 0.38, rx: 0.05, ry: 0.02, weight: 2, density: 0.5 },
    { cx: 0.22, cy: 0.38, rx: 0.04, ry: 0.018, weight: 2, density: 0.45 },

    // === SCATTERED DUST/ENERGY PARTICLES ===
    // Around body (sparse)
    { cx: 0, cy: 0, rx: 0.45, ry: 0.3, weight: 4, density: 0.15 },
    // Around legs
    { cx: 0.2, cy: -0.35, rx: 0.15, ry: 0.1, weight: 2, density: 0.2 },
    { cx: -0.3, cy: -0.3, rx: 0.15, ry: 0.1, weight: 2, density: 0.2 },
    // Behind tail
    { cx: -0.65, cy: 0.12, rx: 0.12, ry: 0.06, weight: 2, density: 0.25 },
    // Around mane
    { cx: 0.25, cy: 0.36, rx: 0.1, ry: 0.05, weight: 2, density: 0.2 },
  ];

  // Calculate total weighted count
  const totalWeight = bodyParts.reduce((sum, part) => sum + part.weight * (part.density || 1), 0);

  for (let i = 0; i < count; i++) {
    // Weighted random selection
    let r = rand() * totalWeight;
    let selectedPart = bodyParts[0];

    for (const part of bodyParts) {
      const partWeight = part.weight * (part.density || 1);
      r -= partWeight;
      if (r <= 0) {
        selectedPart = part;
        break;
      }
    }

    // Generate point within ellipse
    const angle = rand() * Math.PI * 2;
    // Use sqrt for uniform distribution within ellipse
    const radius = Math.sqrt(rand());

    let x = selectedPart.cx + Math.cos(angle) * radius * selectedPart.rx;
    let y = selectedPart.cy + Math.sin(angle) * radius * selectedPart.ry;

    // Add slight depth variation based on position
    const depthVariation = 0.1 + (1 - (selectedPart.density || 1)) * 0.1;
    const z = (rand() - 0.5) * depthVariation;

    // Apply rotation if specified
    if (selectedPart.rotation) {
      const cos = Math.cos(selectedPart.rotation);
      const sin = Math.sin(selectedPart.rotation);
      const rx = x - selectedPart.cx;
      const ry = y - selectedPart.cy;
      x = selectedPart.cx + rx * cos - ry * sin;
      y = selectedPart.cy + rx * sin + ry * cos;
    }

    // Store particle data
    result[i * 4 + 0] = x * scale;
    result[i * 4 + 1] = y * scale;
    result[i * 4 + 2] = z * scale;
    result[i * 4 + 3] = rand(); // Life seed
  }

  return result;
}
