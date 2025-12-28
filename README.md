# The Spirit

GPGPU 기반 파티클 시뮬레이션으로, Three.js의 GPU 컴퓨팅 패턴을 활용하여 25만 개(500x500)의 파티클이 말(Horse) 형상을 따라 움직이는 실시간 시각화 프로젝트입니다.

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
- Core Particles (70%): 말 형상에 밀착, 강한 attraction
- Scatter Particles (30%): 불꽃처럼 흩어지며 떠다님

### 3. Morph Target Mesh Sampling

GLTF 애니메이션의 Morph Target을 실시간으로 샘플링하여 파티클 목표 위치를 업데이트합니다.

- 삼각형 면적 기반 가중치 랜덤 샘플링 (균일 분포)
- Barycentric 좌표로 삼각형 내부 랜덤 포인트 생성

### 4. 파티클 렌더링

- Vertex Shader: 텍스처에서 3D 위치 읽기 (UV → Position)
- Fragment Shader: 원형 파티클 + 3색 그라데이션 + 마우스 호버 인터랙션

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
| GPGPU | Simulator.ts | CPU→GPU 병렬화 (25만 연산) |
| Ping-Pong FBO | FBOHelper.ts | GPU 메모리 재활용 |
| FloatType Texture | RenderTarget | 정밀한 위치 저장 |
| frustumCulled: false | Particles.ts | 불필요한 컬링 계산 제거 |
| depthWrite: false | Particles.ts | 반투명 렌더링 최적화 |

## 기술 스택

- **Three.js r170** - WebGL 추상화
- **GLSL ES 3.0** - GPU 셰이더 프로그래밍
- **Vite + vite-plugin-glsl** - 셰이더 파일 번들링
- **TypeScript** - 타입 안전성
- **Biome** - 코드 포맷팅/린팅

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
    ├── position.frag       # 파티클 위치 계산
    ├── particles.vert      # 파티클 버텍스 셰이더
    ├── particles.frag      # 파티클 프래그먼트 셰이더
    ├── curl.glsl           # Curl Noise 함수
    ├── noise.glsl          # 4D Simplex Noise
    ├── through.vert        # 패스스루 버텍스
    └── through.frag        # 패스스루 프래그먼트
```
