# The Red Horse
### "2026 붉은 말의 해, 25만 개의 불꽃이 당신의 새해를 달린다"

2026년은 병오년(丙午年), 붉은 말의 해입니다. 말은 전진, 열정, 도약을 상징합니다. 25만 개의 붉은 파티클이 모여 말의 형상을 이루고, 흩어졌다 다시 모이며 끊임없이 앞으로 나아갑니다. 멈추지 않는 시간처럼, 멈추지 않는 의지처럼. 새해, 당신의 다짐을 이 말과 함께 시작하세요.

GPGPU 기반 파티클 시뮬레이션으로, Three.js의 GPU 컴퓨팅 패턴을 활용하여 **25만 개(500×500)**의 파티클이 말(Horse) 형상을 따라 움직이는 실시간 시각화 프로젝트입니다.

![Three.js](https://img.shields.io/badge/Three.js-r170-black?logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite)
![WebGL](https://img.shields.io/badge/WebGL-2.0-red)

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         Spirit.ts                           │
│              (Main Controller / Orchestrator)               │
├─────────────────────────────────────────────────────────────┤
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │                    Simulator.ts                       │  │
│  │            (GPU Position Computation)                 │  │
│  │  ┌─────────────────┐  ┌────────────────────────────┐  │  │
│  │  │   FBOHelper.ts  │  │  HorseLoader / MeshSampler │  │  │
│  │  │ (Ping-Pong FBO) │  │    (Target Shape Source)   │  │  │
│  │  └─────────────────┘  └────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │                    Particles.ts                       │  │
│  │              (GPU Rendering Pipeline)                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │              Post-Processing (Bloom)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 핵심 기술

### 1. GPGPU Ping-Pong 패턴

두 개의 RenderTarget을 번갈아 사용하여 GPU에서 25만 개 파티클 위치를 병렬 계산합니다.

- 매 프레임마다 이전 위치 텍스처를 읽고 → 새 위치를 계산 → 다른 텍스처에 저장
- 텍스처 포맷: `RGBA Float32` (xyz = 위치, w = 생명주기)

### 2. Curl Noise 시뮬레이션

발산이 없는(divergence-free) 벡터 필드를 생성하여 유체/연기처럼 자연스러운 흐름을 표현합니다.

**파티클 행동 분리:**
- **Core Particles (80%)**: 말 형상에 밀착, 강한 attraction (0.4), 느린 움직임 (0.02x curl)
- **Scatter Particles (20%)**: 불꽃처럼 흩어지며 떠다님, 약한 attraction (0.08), 빠른 움직임 (0.15x curl)

### 3. Morph Target Mesh Sampling

GLTF 애니메이션의 Morph Target을 실시간으로 샘플링하여 파티클 목표 위치를 업데이트합니다.

- 삼각형 면적 기반 가중치 랜덤 샘플링 (균일 분포)
- Barycentric 좌표로 삼각형 내부 랜덤 포인트 생성

### 4. 파티클 렌더링

**Vertex Shader (`particles.vert`):**
- 텍스처에서 3D 위치 읽기 (UV → Position)
- 거리 기반 포인트 크기: `gl_PointSize = size * (300.0 / length(mvPosition.xyz))`
- 해시 함수로 크기 변화 → 유기적인 외관
- 수명 기반 페이드: `smoothstep(0.0, 0.1, vLife)`

**Fragment Shader (`particles.frag`):**
- 원형 파티클 렌더링 (반경 외부 픽셀 discard)
- 3색 그라디언트 시스템: 빨강 → 주황 → 밝은 분홍
- 마우스 호버 시 황금색 블렌딩 + 밝기 증가
- 코어/엣지 알파 블렌딩으로 부드러운 가장자리

### 5. 포스트 프로세싱

**UnrealBloomPass 설정:**
| 파라미터 | 값 | 설명 |
|----------|-----|------|
| Strength | 0.6 | 글로우 강도 |
| Radius | 0.3 | 블러 반경 |
| Threshold | 0.85 | 밝은 파티클만 블룸 적용 |

### 6. UI/UX 기능

**다크/라이트 모드:**
- 우측 상단 토글 버튼
- CSS transition으로 부드러운 테마 전환 (0.3s ease)
- 배경색, 텍스트, UI 요소 동시 변경

**시계 디스플레이:**
- 실시간 날짜/시간 표시
- 성능 최적화: 초/날짜 변경 시에만 DOM 업데이트
- 폰트: Cormorant Garamond (우아한 세리프)

**마우스 인터랙션:**
- Raycaster로 2D→3D 좌표 변환
- 호버 반경 40 단위 내 파티클 색상 변화
- 터치 디바이스 지원

**카메라 컨트롤:**
- OrbitControls with damping (0.05)
- 수평 회전만 허용 (60°~120° 방위각)
- 거리 제한: 100~200 단위

## 렌더링 파이프라인

```
매 프레임:
1. HorseLoader.mixer.update(dt)     → GLTF 애니메이션 업데이트
2. MeshSampler.sampleMorphed()      → 말 메쉬에서 25만 포인트 샘플링
3. Simulator.update()               → GPU에서 파티클 물리 계산 (FBO)
4. Particles.update()               → 위치 텍스처 → Points 렌더링
5. EffectComposer.render()          → UnrealBloomPass 포스트 프로세싱
```

## 성능 최적화

| 기법 | 위치 | 효과 |
|------|------|------|
| GPGPU 병렬 처리 | Simulator.ts | CPU→GPU 병렬화 (25만 연산 동시 처리) |
| Ping-Pong FBO | FBOHelper.ts | GPU 메모리 재활용, 읽기/쓰기 분리 |
| Float32 Texture | RenderTarget | 정밀한 위치 저장 (양자화 오류 방지) |
| NearestFilter | FBOHelper.ts | 텍스처 보간 오버헤드 제거 |
| frustumCulled: false | Particles.ts | 불필요한 프러스텀 컬링 계산 제거 |
| depthWrite: false | Particles.ts | 반투명 렌더링 z-buffer 쓰기 생략 |
| Clock 캐싱 | Spirit.ts | 초/날짜 변경 시에만 DOM 업데이트 |
| dt 클램핑 | Spirit.ts | `Math.min(dt, 0.1)`로 프레임 점프 방지 |
| 텍스처 메모리 재사용 | Simulator.ts | 매 프레임 새 텍스처 생성 대신 데이터만 교체 |

**메모리 사용량:**
- 위치 텍스처: 500×500 × RGBA Float32 = ~4MB × 2 (Ping-Pong)
- 총 GPU 메모리: ~10MB

## 기술 스택

| 분류 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 그래픽스 | Three.js | r170 | WebGL 2.0 추상화 |
| GPU 컴퓨트 | GLSL ES | 3.0 | 셰이더 프로그래밍 |
| 빌드 도구 | Vite | 6.4.1 | 빠른 개발 서버 & 번들링 |
| 셰이더 번들링 | vite-plugin-glsl | 1.3.0 | .glsl/.vert/.frag 파일 임포트 |
| 언어 | TypeScript | 5.7.2 | 타입 안전성 |
| 린팅 | Biome | 2.3.10 | 코드 포맷팅/품질 관리 |

## 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 코드 포맷팅
pnpm format
```

## 프로젝트 구조

```
src/
├── main.ts                 # 엔트리 포인트
├── 3d/
│   ├── Spirit.ts           # 메인 컨트롤러
│   ├── Simulator.ts        # GPGPU 파티클 시뮬레이션
│   ├── Particles.ts        # 파티클 렌더링
│   ├── FBOHelper.ts        # FBO 유틸리티
│   └── HorseLoader.ts      # GLTF 모델 로더
├── utils/
│   └── MeshSampler.ts      # 메쉬 표면 샘플링
└── shaders/
    ├── position.frag       # GPGPU 파티클 위치 계산 (핵심 물리 로직)
    ├── particles.vert      # 파티클 버텍스 셰이더 (텍스처→3D 위치)
    ├── particles.frag      # 파티클 프래그먼트 셰이더 (색상/알파)
    ├── curl.glsl           # Curl Noise 함수 (발산 없는 벡터장)
    ├── noise.glsl          # 4D Simplex Noise (Stefan Gustavson 구현)
    ├── through.vert        # FBO 렌더링용 풀스크린 쿼드
    └── through.frag        # 패스스루 프래그먼트
```

## 셰이더 상세

### position.frag (GPGPU 핵심)

```glsl
// 파티클 타입 분리
float isScatter = step(0.80, seed);  // 20%는 흩어지는 파티클

// Curl Noise로 자연스러운 움직임
vec3 noise = curl(targetPos * curlSize, time * 0.01, 0.1);

// 목표 위치로의 attraction
vec3 direction = targetPos - currentPos;
currentPos += direction * attraction;
```

### curl.glsl (물리 시뮬레이션)

```glsl
// 3옥타브 fBm으로 복잡한 노이즈 생성
// Curl 연산: ∇ × F (발산 없는 벡터장)
curl(P) = (∂Z/∂y - ∂Y/∂z, ∂X/∂z - ∂Z/∂x, ∂Y/∂x - ∂X/∂y)
```

## 라이선스

MIT License

## 크레딧

- **Horse 3D Model**: [Three.js Examples](https://threejs.org/examples/models/gltf/Horse.glb)
- **Simplex Noise**: Stefan Gustavson (Linköping University)
- **Curl Noise**: Robert Bridson et al.
