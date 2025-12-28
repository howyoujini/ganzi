precision highp float;

uniform vec2 resolution;
uniform sampler2D texturePosition;
uniform sampler2D textureDefaultPosition;
uniform float time;
uniform float speed;
uniform float dieSpeed;
uniform float radius;
uniform float curlSize;
uniform float attraction;
uniform float initAnimation;
uniform vec3 followPoint;
uniform vec3 mousePosition;
uniform float mouseStrength;

#include "./noise.glsl"
#include "./curl.glsl"

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 positionInfo = texture2D(texturePosition, uv);
  vec4 defaultPos = texture2D(textureDefaultPosition, uv);

  vec3 position = positionInfo.xyz;
  float life = positionInfo.a - dieSpeed;

  vec3 targetPos = defaultPos.xyz;
  float seed = defaultPos.w;

  // 80% stay on surface, 20% scatter/fly off
  float isScatter = step(0.80, seed);

  // Simplified noise calculation (reuse same noise for performance)
  vec3 noise = curl(targetPos * 0.01, time * 0.01, 0.1);

  if (life < 0.0) {
    // Core particles: tight to surface
    // Scatter particles: spread out and trail
    float scatter = mix(1.0, 6.0 + seed * 8.0, isScatter);
    vec3 scatterDir = noise + vec3(-1.0, 0.5, 0.0) * seed * isScatter;

    position = targetPos + scatterDir * scatter;
    life = mix(0.5, 0.3, isScatter) + fract(seed * 17.31 + time) * 0.5;
  } else {
    // Core: stay tight, Scatter: drift away
    float scatter = mix(1.0, 4.0 + seed * 6.0, isScatter);
    vec3 scatterDir = noise + vec3(-0.8, 0.3, (seed - 0.5) * 0.5) * isScatter;

    vec3 offsetTarget = targetPos + scatterDir * scatter;

    // Core: strong attraction, Scatter: weak attraction (drift)
    float attr = mix(0.4, 0.08, isScatter) * attraction;
    position = mix(position, offsetTarget, attr);

    // Movement: minimal for core, more for scatter
    float moveStrength = mix(0.02, 0.15, isScatter);
    position += noise * speed * moveStrength * curlSize * 10.0;
  }

  gl_FragColor = vec4(position, life);
}
