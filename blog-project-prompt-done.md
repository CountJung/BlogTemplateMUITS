# 블로그 프로젝트 (VSCode용 프롬프트)

설명
- 이 파일은 VSCode에서 개발 작업 시작 시 복사해서 사용하거나 AI(예: Copilot, ChatGPT 플러그인)에 입력해 작업 지시로 사용할 프롬프트입니다.
- 목표: next.js + React + MUI 기반의 반응형 블로그를 단계별로 구현하고, Google OAuth 로그인 기능을 추가한다.

기술 스택
- Next.js (최신 권장 버전)
- React
- MUI (Material UI)
- Optional: NextAuth.js 또는 Firebase Auth (Google OAuth 연동 선택)

프로젝트 초기 설정 (권장 명령)
1. 프로젝트 생성
   - npm init -y
   - npm install next react react-dom @mui/material @emotion/react @emotion/styled
   - (선택) npm install next-auth @next-auth/google
2. package.json scripts 예시
   - "dev": "next dev"
   - "build": "next build"
   - "start": "next start"

브랜치 / 커밋 규칙 (권장)
- 브랜치: feature/step-1-landing, feature/step-2-layout-auth, feature/step-3-implement, feature/step-4-responsive
- 커밋 메시지: feat(step-1): 랜딩 페이지 추가

단계별 요구사항 및 수용 기준

1단계 — 기본 빌드 및 랜딩
- 작업
  - 메인 랜딩 페이지 생성 (pages/index.js 또는 app 디렉토리 사용)
  - 프로젝트 빌드/실행 가능해야 함
  - 간단한 소개 텍스트(타이틀, 한두 문단)
- 수용 기준
  - npm run dev 로 로컬에서 오류 없이 페이지 로드
  - 페이지에 프로젝트 소개 텍스트가 표시됨

2단계 — 레이아웃 및 Google 인증 페이지
- 작업
  - 공통 레이아웃(헤더, 푸터, 네비게이션) 컴포넌트 생성 (MUI AppBar 등 사용)
  - 블로그 목록/단일 게시글 페이지 라우트 자리 확보
  - Google 인증 로그인 페이지(로그인 버튼 및 OAuth 시작 버튼) 추가
- 수용 기준
  - 레이아웃을 적용했을 때 모든 라우트에서 헤더/푸터가 정상 노출
  - 로그인 페이지에서 Google 로그인 흐름(클라이언트 버튼 및 redirect)이 준비됨(실제 OAuth 설정 정보는 환경변수로 분리)

3단계 — 기능 구현
- 작업
  - 블로그 목록 페이지: 더미 데이터 또는 Markdown/MDX 기반의 게시글 리스트 렌더링
  - 게시글 읽기 페이지: 상세 콘텐츠 렌더링
  - CRUD 중 일부(작성/편집/삭제)는 최소한 읽기/목록 기능 우선 구현
  - Google 인증 로그인 완료 시 사용자 정보(이메일, 이름) 표시
- 수용 기준
  - 목록 클릭 시 게시글 상세 페이지 이동
  - 로그인 후 사용자명 또는 이메일이 화면(헤더 등)에 표시됨

4단계 — 반응형 + MUI 적용 검증
- 작업
  - 모든 화면이 모바일 / 태블릿 / 데스크톱에서 자연스럽게 보이도록 반응형 레이아웃 적용 (MUI Grid, useMediaQuery 사용 권장)
  - 모든 UI 컨트롤(버튼, 입력, 카드, 네비 등)은 MUI 컴포넌트로 구현됐는지 확인
- 수용 기준
  - Chrome DevTools 또는 실제 디바이스에서 모바일/PC 모두 레이아웃 깨짐 없음
  - 프로젝트 전반에 MUI 컴포넌트가 사용되었음을 코드베이스에서 검토(예: Button, AppBar, Grid, TextField 등)
  - 수동 검사 체크리스트:
    - [ ] 헤더/네비/푸터 모두 MUI로 구현
    - [ ] 모든 폼 입력이 MUI TextField 사용
    - [ ] 버튼이 MUI Button 사용
    - [ ] 카드/리스트가 MUI Card/List 사용
    - [ ] 반응형 breakpoint에 따라 레이아웃 전환 확인

환경변수 및 보안
- Google OAuth 설정
  - .env.local 예시:
    - NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
    - GOOGLE_CLIENT_SECRET=your-client-secret
- .env.local 은 절대 커밋하지 말 것

테스트 / 확인 명령
- 개발 서버: npm run dev
- 빌드 확인: npm run build && npm run start
- ESLint/Prettier 권장 설정 적용

추가 권장사항
- 인증 구현 시 NextAuth.js 사용 권장(간단한 설정으로 Google OAuth 가능)
- 이미지와 정적 파일은 next/image 및 public 폴더 활용
- 상태관리: 간단한 프로젝트면 Context 또는 SWR/React Query로 데이터 패칭 관리

PR 템플릿(간단)
- 제목: feat(step-X): {간단한 설명}
- 본문:
  - 변경 사항 요약
  - 작업 항목 체크리스트
  - 테스트 방법(로컬 실행 방법)
  - 관련 이슈/참조

사용 예시 (VSCode 내 AI에 붙여넣기)
- "이 프로젝트의 1단계 구현을 위해 필요한 파일 리스트와 각 파일 내용(Next.js 페이지와 MUI 컴포넌트 예시)을 생성해줘."
- "2단계에서 Google OAuth 로그인 페이지와 NextAuth 설정 예시 코드를 만들어줘."

끝으로
- 이 프롬프트를 VSCode에서 복사해 Copilot/AI 확장에 붙여넣고 단계별로 요청하세요.
- 필요하면 각 단계별 템플릿 코드(예: pages/index.jsx, components/Layout.jsx, auth/[...nextauth].js)를 생성해 드리겠습니다.