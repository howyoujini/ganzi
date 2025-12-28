precision highp float;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 hoverColor;

varying float vLife;
varying vec3 vPosition;
varying float vSize;
varying float vMouseDist;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  if (dist > 0.5) discard;

  // Sharp, defined particle edges
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  alpha *= smoothstep(0.0, 0.1, vLife);

  // Solid core with soft edge
  float core = 1.0 - smoothstep(0.0, 0.25, dist);
  alpha = mix(alpha * 0.7, 1.0, core);

  // 3-color gradient based on life and size
  float t = vLife * 0.6 + vSize * 0.4;
  vec3 color;
  if (t < 0.5) {
    color = mix(color1, color2, t * 2.0);
  } else {
    color = mix(color2, color3, (t - 0.5) * 2.0);
  }

  // Mouse hover color change
  color = mix(color, hoverColor, vMouseDist * 0.9);
  alpha = mix(alpha, 1.0, vMouseDist * 0.3);

  gl_FragColor = vec4(color, alpha);
}
