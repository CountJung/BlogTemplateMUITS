# BlogTemplateMUITS

Next.js Pages Router, Material UI, NextAuth Google OAuth를 사용하는 파일 기반 블로그다.
게시글은 Markdown, 사용자·댓글·설정 등은 로컬 JSON 파일에 저장한다.

## 시작하기

Node.js 22.13 이상인 22.x 또는 24 이상을 사용한다. 의존성 버전 정본은
[package-lock.json](package-lock.json), 실행 명령 정본은 [package.json](package.json)이다.

```bash
npm ci
cp .env.example .env.local
# .env.local에 로컬 OAuth 설정과 NEXTAUTH_SECRET을 입력한다.
npm run dev
```

기본 개발 주소는 http://localhost:65002 이다. `NEXTAUTH_URL`과 Google OAuth 콜백도
같은 로컬 주소를 사용한다. 운영 자격증명이나 데이터를 로컬 검증에 복사하지 않는다.

```bash
npm run type-check
npm run lint
npm test
npm run build
npm run test:http
npm start
```

실행 결과와 미검증 조건은 [검증 기록](docs/verification.md)을 확인한다.
배포 전 결정과 외부 설정 작업은 [TODO](docs/TODO.md)에 남긴다.

## VS Code 디버깅

저장소 폴더를 VS Code에서 열고 실행 및 디버그에서 **Next.js: Full Stack**을 선택한 뒤 F5를 누른다.
개발 서버가 준비된 뒤 Chrome이 열리며, 디버깅을 중지하면 Chrome 디버그 세션도 종료된다.
브라우저 없이 서버만 디버깅하려면 **Next.js: Server**를 선택한다.
F5 전에 이 프로젝트의 `npm run dev`를 따로 실행하지 않는다.

개발 및 로컬 Google OAuth는 [http://localhost:65002](http://localhost:65002)를 그대로 사용한다.
`npm start`는 빌드 후 [http://127.0.0.1:65003](http://127.0.0.1:65003)에서
별도 합성 미리보기를 실행하므로 개발 서버와 동시에 사용할 수 있다. 미리보기 종료는 Ctrl+C다.
65002가 이미 사용 중이라면 [포트 점유 확인](docs/operations.md#vs-code-포트-충돌)을 참고한다.

## 문서 안내

- [문서 등록부·에이전트 지침](AGENTS.md)
- [운영 및 개발 안내](docs/operations.md): 환경, 저장소 구조, 권한과 개발 규칙
- [우선순위 TODO](docs/TODO.md): 남은 작업과 완료 조건
- [검증 기록](docs/verification.md): 코드 상태, 절차, 결과, 미검증 경계
- [과거 자료 색인](docs/history/README.md): 초기 요구사항과 이전 보고서

현재 저장소에는 Docker 배포 설정과 라이선스 파일이 없다. 라이선스 선택과 배포 환경은
[TODO](docs/TODO.md)에서 별도로 관리한다.
