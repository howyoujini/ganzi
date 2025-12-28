// Curl Noise - creates divergence-free vector field for fluid-like motion

vec3 curl(vec3 p, float noiseTime, float persistence) {
  vec4 xNoisePotentialDerivatives = vec4(0.0);
  vec4 yNoisePotentialDerivatives = vec4(0.0);
  vec4 zNoisePotentialDerivatives = vec4(0.0);

  for (int i = 0; i < 3; i++) {
    float scale = (1.0 / 2.0) * pow(2.0, float(i));
    float noiseScale = pow(persistence, float(i));

    if (persistence == 0.0 && i == 0) {
      noiseScale = 1.0;
    }

    xNoisePotentialDerivatives += simplexNoiseDerivatives(
      vec4(p * pow(2.0, float(i)), noiseTime)
    ) * noiseScale * scale;

    yNoisePotentialDerivatives += simplexNoiseDerivatives(
      vec4((p + vec3(123.4, 129845.6, -1239.1)) * pow(2.0, float(i)), noiseTime)
    ) * noiseScale * scale;

    zNoisePotentialDerivatives += simplexNoiseDerivatives(
      vec4((p + vec3(-9519.0, 9051.0, -123.0)) * pow(2.0, float(i)), noiseTime)
    ) * noiseScale * scale;
  }

  return vec3(
    zNoisePotentialDerivatives.y - yNoisePotentialDerivatives.z,
    xNoisePotentialDerivatives.z - zNoisePotentialDerivatives.x,
    yNoisePotentialDerivatives.x - xNoisePotentialDerivatives.y
  );
}
