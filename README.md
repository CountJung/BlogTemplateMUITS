# BlogTemplateMUITS

Next.js Pages Router, Material UI, NextAuth Google OAuth를 사용하는 파일 기반 블로그다.
게시글은 Markdown, 사용자·댓글·설정 등은 로컬 JSON 파일에 저장한다.

## 시작하기

이 프로젝트의 로컬 기준은 Node.js 26.13.1 LTS와 npm 12.2.3이다.
Volta는 프로젝트 안에서 [package.json](package.json)의 고정 버전을 사용한다.
Volta가 없다면 같은 버전을 설치한다. 의존성 잠금 기준은 [package-lock.json](package-lock.json)이다.

```powershell
npm.cmd ci
npm.cmd run dev
```

개발 주소는 [http://localhost:65002](http://localhost:65002)이며 루프백에만 바인딩한다.
기존 설정을 덮어쓰지 않는다. 실제 로컬 Google 로그인이 필요할 때만 `.env.example`을
참고해 개발용 OAuth 값과 `NEXTAUTH_SECRET`을 설정한다. `NEXTAUTH_URL`과 콜백 주소는 같은 호스트를 사용한다.
운영 자격증명이나 데이터를 로컬 검증에 복사하지 않는다.

```powershell
npm.cmd run type-check
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:http
npm.cmd start
```

Windows 외 환경에서는 `npm`을 사용한다.

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
