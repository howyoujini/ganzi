precision highp float;

uniform sampler2D texturePosition;
uniform float pointSize;
uniform vec3 mousePosition;
uniform float mouseStrength;

varying float vLife;
varying vec3 vPosition;
varying float vSize;
varying float vMouseDist;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 positionInfo = texture2D(texturePosition, position.xy);
  vLife = positionInfo.w;
  vPosition = positionInfo.xyz;

  // Calculate mouse distance
  float mouseDist = length(positionInfo.xyz - mousePosition);
  float mouseRadius = 40.0;
  vMouseDist = mouseStrength > 0.0 ? clamp(1.0 - mouseDist / mouseRadius, 0.0, 1.0) : 0.0;

  vec4 mvPosition = modelViewMatrix * vec4(positionInfo.xyz, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size variation for visual interest
  float sizeVar = hash(position.xy);
  vSize = sizeVar;

  // Particle size: mostly uniform with some variation
  float sizeMult = 0.8 + sizeVar * 0.5; // 0.8 - 1.3 range

  float size = pointSize * sizeMult;
  gl_PointSize = size * (300.0 / length(mvPosition.xyz));
  gl_PointSize *= smoothstep(0.0, 0.1, vLife);
  gl_PointSize = max(gl_PointSize, 1.5); // Minimum size for visibility
}
