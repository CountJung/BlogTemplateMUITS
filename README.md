# Next.js Blog Project

Google OAuth 인증과 역할 기반 권한 시스템을 갖춘 현대적인 블로그 플랫폼입니다.

## 🚀 주요 기능

- **Google OAuth 로그인**: NextAuth.js 기반 인증
- **역할 기반 권한 시스템**:
  - **Admin**: 모든 권한 (읽기, 쓰기, 모든 글 삭제) + 사용자 관리
  - **Writer**: 읽기, 쓰기, 자신의 글만 삭제
  - **Reader**: 읽기 전용
- **관리자 페이지**: 사용자 권한 관리 (역할 변경, 사용자 삭제)
- **다국어 지원 (i18n)**: 한국어/영어 지원 및 중첩 키 구조 개선
- **다크/라이트 테마**: 시스템 설정 자동 감지 및 수동 전환
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **사용자 경험 개선**:
  - **Scroll to Top**: 긴 페이지에서 상단으로 빠르게 이동하는 버튼 제공
  - **페이지네이션**: 페이지당 10개 게시글 표시로 탐색 효율성 증대
- **마크다운 지원**: 코드 하이라이팅 포함

## 📅 최근 업데이트 (2025.11.26)

- **i18n 시스템 개선**: `LanguageContext` 리팩토링을 통해 중첩된 번역 키(예: `settingsPage.korean`) 지원 추가.
- **UI/UX 강화**:
  - 홈 화면 게시글 목록 표시 개수 상향 (5개 → 10개).
  - 스크롤 시 나타나는 '맨 위로 가기' 버튼(FAB) 추가.
- **버그 수정**: 관리자 페이지(`admin/index.tsx`) 변수 참조 오류 수정.

## 📋 시작하기

### 1. 환경 설정

`.env.example` 파일을 `.env`로 복사하고 실제 값으로 변경하세요:

```bash
cp .env.example .env
```

### 2. 환경 변수 설정

`.env` 파일을 편집하여 다음 값들을 설정하세요:

```env
# NextAuth.js
NEXTAUTH_URL=http://localhost:54321
NEXTAUTH_SECRET=your-very-secure-random-secret-key-minimum-32-characters

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Permission Settings (초기 관리자만 설정)
ADMIN_EMAILS=admin@example.com

# 일반 사용자와 작성자 권한은 관리자 페이지(/admin)에서 관리합니다.
```

**⚠️ 중요**: `WRITER_EMAILS` 환경 변수는 더 이상 사용되지 않습니다. 모든 권한 관리는 관리자 페이지에서 처리됩니다.

### 3. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **APIs & Services** → **Credentials** 이동
4. **OAuth 2.0 Client IDs** 생성:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:54321/api/auth/callback/google`
     - (프로덕션) `https://your-domain.com/api/auth/callback/google`

### 4. 의존성 설치 및 실행

\`\`\`bash
npm install
npm run dev
\`\`\`

브라우저에서 http://localhost:54321 접속

## 🔐 권한 시스템

### 권한 관리 방식

1. **초기 설정**: `.env` 파일의 `ADMIN_EMAILS`에 초기 관리자 이메일 설정
2. **자동 등록**: 사용자가 로그인하면 자동으로 `data/users.json`에 등록됩니다
3. **권한 관리**: 관리자는 `/admin` 페이지에서 모든 사용자의 권한을 관리할 수 있습니다

### 권한별 기능

#### Admin 권한
- 모든 게시글 읽기
- 새 게시글 작성
- 모든 게시글 삭제 (다른 사용자의 글 포함)
- **사용자 관리 페이지 접근**
- **사용자 권한 변경 및 삭제**

#### Writer 권한
- 모든 게시글 읽기
- 새 게시글 작성
- **자신이 작성한 게시글만 삭제 가능**

#### Reader 권한 (기본)
- 게시글 읽기만 가능

### 사용자 관리 페이지

관리자는 `/admin` 경로에서 다음 작업을 수행할 수 있습니다:

- 📊 사용자 통계 확인 (전체/관리자/작성자/독자 수)
- 👥 전체 사용자 목록 조회
- ✏️ 사용자 권한 변경 (READER ↔ WRITER ↔ ADMIN)
- 🗑️ 사용자 삭제
- 🔍 이메일/이름으로 사용자 검색

## 🛠️ 기술 스택

- **Framework**: Next.js 16.0.1
- **UI Library**: Material-UI (MUI) 7.3.4
- **Authentication**: NextAuth.js 4.24.13
- **Styling**: Emotion
- **Markdown**: react-markdown, remark-gfm, rehype-highlight
- **Language**: TypeScript

## 📂 프로젝트 구조

\`\`\`
├── components/          # React 컴포넌트
│   ├── Layout.tsx      # 레이아웃 및 네비게이션
│   └── ThemeSwitcher.tsx # 테마 전환 컴포넌트
├── contexts/           # React Context
│   └── ThemeContext.tsx # 테마 상태 관리
├── content/            # 마크다운 게시글
│   └── posts/
├── lib/                # 유틸리티 함수
│   ├── admin.ts        # 권한 관리
│   └── posts.ts        # 게시글 CRUD
├── pages/              # Next.js 페이지
│   ├── api/            # API 라우트
│   ├── auth/           # 인증 페이지
│   ├── blog/           # 블로그 페이지
│   └── index.tsx       # 홈페이지
├── types/              # TypeScript 타입 정의
└── .env.example        # 환경 변수 템플릿
\`\`\`

## 🔒 보안 주의사항

- `.env` 파일은 **절대 Git에 커밋하지 마세요**
- `NEXTAUTH_SECRET`은 최소 32자 이상의 안전한 랜덤 문자열을 사용하세요
- 프로덕션 환경에서는 HTTPS를 사용하세요
- Google OAuth 리디렉션 URI를 정확히 설정하세요

## 🚀 프로덕션 배포

### 환경 변수 설정
프로덕션 환경에서는 `.env.production` 파일 또는 호스팅 플랫폼의 환경 변수 설정을 사용하세요.

### 빌드
\`\`\`bash
npm run build
npm start
\`\`\`

### Docker 배포
시놀로지 NAS 등의 Docker 환경에서 배포 가능합니다. (docker-compose.yml 참조)

## 📝 라이선스

MIT

## 🤝 기여

이슈와 풀 리퀘스트를 환영합니다!
