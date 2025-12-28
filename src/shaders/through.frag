precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  gl_FragColor = texture2D(tDiffuse, uv);
}
