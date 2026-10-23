# 조사 및 검증 기록

## 기준 상태와 범위

2026-10-23 사용자 Mac mini의 별도 작업 공간에 새로 복제했다.
기준은 `main`의 `d9e90be`이며 복제 직후 `git status --short` 출력은 비어 있었다.
기존 사용자 체크아웃을 덮어쓰지 않았다. 초기 구현·검증은 미커밋 로컬 변경으로 수행했다.
후속 커밋·푸시의 실제 결과는 아래 회차 기록에서 구분한다.

저장소 안에 기존 `AGENTS.md`, `CLAUDE.md`, `.agents/skills`는 없었다.
docs-canon 개인 스킬 본문은 연결된 스킬 원본에서 읽었다. 사용자 승인 전달본을
Library에서 `/tmp/docs-canon-approved`로 가져와 18개 항목의 경로와 심볼릭 링크 부재를 확인했다.
ZIP SHA-256은 `cb798d98dbd99e37f13548212c33e5f88d9266d299dd1a1c4f48c13adbc3d470`,
검사기 SHA-256은 `eea96823d5f0bf1b064f02f4fef9b10ae04d1834d2561bf8b2327767a987f8a7`로
전달된 승인값과 일치했다. 스킬 전체를 저장소나 전역 경로에 설치하지 않았다.
형식 검사는 각 변경 회차의 정본 동기화 후 1회씩 실행하고 결과를 해당 절에 구분한다.

현재 운영 공격·로그인·운영 데이터 읽기·배포·NAS 설정 변경·PR은 수행하지 않는다.
초기 원격 푸시 금지 범위는 후속 사용자 명시 승인으로 바뀌었으며, 빌드·검증 후 커밋·푸시를 허용한다.
조사 범위는 버전·공지 대조, 서버 권한·입력 검증, 공개 DTO·페이지네이션,
헤더·첨부 경로·렌더링, 기존 테스트와 이슈다.

## 전달받은 외부 관찰

아래는 2026-10-23 00:27 UTC에 다른 조사 단계에서 확인하여 전달받은 관찰이다.
이번 로컬 검증으로 재실행하거나 현재 배포 커밋과 연결하지 않았다.

- HTTPS 홈은 Pages Router의 `__NEXT_DATA__`, `/`, `gssp: true`와 Turbopack 자산을 반환했다.
- HTTP는 HTTPS 리디렉션 대신 HTTP 200 `CountJung NAS Landing`을 반환했다.
- HTTPS 홈·로그인에는 HSTS가 있으나 CSP, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy는 없었다.
- 초기 SSR에 게시글 144개 전체 본문, `authorEmail` 141개, 첨부 메타데이터 150개가 있었다.
- 공개 글의 존재 자체는 권한 결함 증거가 아니다. 공격 요청·파일 내용 열람은 없었다.

## 조사 기준과 보안 공지 대조

기준 lockfile은 Next.js 16.0.1, React 19.2.0, NextAuth 4.24.13, sharp 0.34.4다.
구현 담당이 실행한 초기 `npm audit`는 총 13건(critical 2, high 6, moderate 5)을 보고했다.
이 숫자는 의존성 그래프의 도구 결과이며 운영 사이트 공격 성공을 뜻하지 않는다.
GitHub의 `repo:CountJung/BlogTemplateMUITS is:issue` 검색은 이슈 0건을 반환했다.

[Next.js 공식 2026-10-14 공지](https://nextjs.org/blog/nextjs-security-update-october-14-2026)는
수정 버전 16.4.1/15.5.28을 제시한다. App Router의 Cache Components 및 Server Actions에
관한 두 항목은 현재 소스의 Pages Router 구성과 조건이 다르다. 이미지 최적화 SVG 경로는
sharp 버전과 glibc 기반 Linux 등 배포 조건 확인이 필요하다. 배포 버전·환경을 알 수 없어
해당 운영 사이트가 취약하다고 단정하지 않는다.

## 확인된 기준 코드 결함

| ID | 기준 코드와 관찰 | 판정 범위 |
| --- | --- | --- |
| SEC-001 | `pages/api/settings/system.ts`와 `language.ts` POST에 세션·관리자 검사 없음. 글 수정·삭제는 작성자 이메일 일치로 현재 작성 권한 부재를 우회 | 소스상 서버 권한 결함. 실제 운영 요청으로 악용 확인하지 않음 |
| SEC-002 | 글 생성 ID·날짜가 경로 조합에 직접 사용되고 기존 파일 덮어쓰기 가능. 업로드는 신고 MIME만 검사하고 원확장자로 공개 폴더 저장 | 합성 입력으로 회귀 검증할 코드 결함. 운영 파일 조작하지 않음 |
| DATA-001 | 홈 SSR이 `getAllPosts()` 결과 전체를 전달해 전체 본문·이메일·첨부 포함 | 공개 DTO 최소화와 서버 페이지네이션 필요. 공개 글 자체를 비공개 글 유출로 판정하지 않음 |
| SEC-003 | `next.config.ts`에 공통 보안 헤더 없음 | 저장소 개선 대상. 최종 응답 헤더는 운영 프록시 별도 확인 |

## 1차 보안 개선 검증

아래는 1차 보안 개선을 마친 당시의 `d9e90be` 이후 미커밋 변경 트리 검증이다.
후속 변경을 검증한 결과로 재사용하지 않는다. 당시 환경은 macOS, Node.js v26.3.0,
npm 11.16.0이다. 잠금 파일 SHA-256은
`75fc072b10e5c0b6554a99d1f32c924d9444bb1dc7c5bfd2c26ba4b66611090b`다.
최종 주요 의존성은 Next.js 16.4.1, React/React DOM 19.3.1, NextAuth 4.24.15,
sharp 0.35.5, tsx 4.23.15, js-yaml 3.15.2, postcss 8.5.23이다.

기준 코드를 임시 합성 cwd에서 실행하여 익명 system/language 변경이 모두 HTTP 200,
중복 ID 덮어쓰기·ID의 날짜 폴더 이탈·접미사 별칭 조회가 참임을 재현했다.
작성자 강등 후 수정·삭제도 200을 반환했다. 운영 API에는 요청하지 않았다.

| 절차 | 모드·입력 | 최종 결과 |
| --- | --- | --- |
| `npm ci --ignore-scripts` | 잠금 파일 설치 | 통과 |
| `npm test` | 임시 합성 저장소, 모킹된 인증·로깅·스케줄러 및 인증 callback 회귀 | 15/15 통과 |
| `npm run type-check` | 최종 TypeScript 변경 트리 | 통과 |
| `npm run build` | 조회수 API 후속 수정 포함 production build | exit 0, 동적 fs의 broad trace 경고 10개 |
| `npm run test:http` | standalone 임시 복사, 23개 합성 글, 실제 서명된 로컬 NextAuth 쿠키·multipart·실제 HTTP | 47개 assertion 통과 |
| `npm audit` | 2026-10-23 npm DB·최종 잠금 그래프 | 모든 심각도 0건 |
| `git diff --check` | 로컬 변경 | 통과 |
| lint | 설정·스크립트 없음 | 미실행 |
| 실제 브라우저 UI | 화면 검증 접근·승인 경계 | 미검증·승인 대기 |
| 실제 Google OAuth·운영 배포·프록시·기존 운영 데이터 | 이번 실행 범위 밖 | 미실행 |

HTTP 검증은 익명·독자·다른 작성자·관리자 권한, 같은 서명 쿠키를 유지한 역할 강등 후
PUT/DELETE 403, 정상 날짜의 업로드 경로·중복 생성 409, 공개 DTO·페이지네이션,
multipart 파일 업로드, 파일 sandbox·nosniff와 공통 헤더를 확인한다.
테스트의 임시 runtime과 서버는 finally에서 정리한다.
악성 ID·날짜 입력 거부는 모킹 API·저장소 단위 회귀에서 확인했다.
함수 회귀는 없는 글 조회수 기록 파일 미생성·정상 중복 조회와 관리 API의 오래된 역할 거부도 확인한다.
실제 서비스 로그인이나 운영 데이터로 대체하지 않았다.

최종 build와 audit의 임시 원출력은 `/tmp/blog-final-build.log`,
`/tmp/blog-final-audit.json`이었다. 재사용 절차의 정본은 저장소의
[회귀 테스트](../tests/security.test.cjs), [인증 테스트](../tests/auth.test.cjs),
[HTTP smoke](../tests/http-smoke.cjs)다. 임시 로그 보존을 재현의 전제 조건으로 삼지 않는다.

최초 로컬 listen의 sandbox EPERM은 승인 실행으로 해결했다.
최초 HTTP 복사 harness가 상대 symlink를 절대 경로로 바꿔 React 인스턴스를 중복시켰으나
`verbatimSymlinks: true`로 교정했다. 해결된 환경·harness 문제이며 현재 제품 실패로 계산하지 않는다.

실제 브라우저는 IAB 사용 불가·Chrome 탭 생성 timeout·localhost 탭 조회 실패로 화면 검증을
완료하지 못했다. 브라우저 승인 요청이 대기 중이어서 추가 UI 조작을 중지했다.
로컬 preview 서버를 종료하고 합성 runtime을 정리했다. UI-001은 승인 완료 후 재개할 열린 작업이다.

## 1차 문서 책임과 내용 검토

README는 현재 시작 안내로 축소했고, 운영·개발 규칙은 `operations.md`,
열린 작업은 `TODO.md`, 검증과 완료 이력은 이 파일이 소유한다.
기존 개발 프롬프트와 MUI 보고서는 [과거 자료](history/README.md)에 원문을 보존했다.
README의 날짜별 업데이트도 별도 과거 기록으로 이관했다.

현재 코드와 맞지 않던 기본 포트 54321 안내는 package scripts의 65002에 맞췄다.
존재하지 않는 Docker Compose 참조는 현재 구성 부재로 교체했다.
라이선스 선택은 미확정 TODO로 남겼다.

내용 검토는 현재 설명이 코드·검증 근거와 일치하는지, 다음 할 일과 미검증 조건이 명확한지,
중복 상세 정본이나 사라진 고유 근거가 없는지 확인했다. 기존 프롬프트·MUI 보고서는
`git show HEAD:<원래 파일>`과 대조하여 원문 전체 보존을 확인했고 날짜별 업데이트도 보존했다.
라이선스·Docker·실행 포트 안내의 차이를 교정하거나 열린 조건으로 명시했다.

형식 검사 명령은 다음과 같다. 내용 검토와 별도이며 결과는 아래에 기록한다.

```bash
/opt/homebrew/bin/python3.14 /tmp/docs-canon-approved/extracted/docs-canon/scripts/check_docs.py . --changed
```

형식 검사 결과: 1회 실행, exit 0. Markdown 10개 검사에서 깨진 상대 링크·표 열 수·
끊긴 표·등록부 도달성 오류와 긴 줄·앵커·TODO 완료 항목 경고 모두 0개였다.
이는 형식 오류 없음이며 내용 검토는 위의 별도 절차로 완료했다.

## 2차 저장 무결성·패키징 개선 검증

대상은 1차 완료 상태에서 잔여 로컬 TODO를 구현한 미커밋 변경 트리다.
환경은 같은 macOS·Node.js v26.3.0·npm 11.16.0이며, 최종 잠금 파일 SHA-256은
`1f4bade1145b1c2ba9fc23b492895eaca9ca4bdbf5a80f23dc18b2a9c5c14084`다.
Node.js 지원 조건은 lint 의존성에 맞춰 `^22.13.0 || >=24.0.0`로 명시했다.
코드 담당이 구현·코드 검증을, 문서 담당이 기존 정본 동기화·문서 검증을 수행했다.

기준 `d9e90be`의 사용자·댓글·게시글·조회수 코드를 임시 폴더에 복사한 합성 probe에서
4개 프로세스가 사용자 50명씩 생성을 요청했다. 성공 응답 200건에 비해 저장된 사용자는
3명으로 갱신 유실을 재현했다. 운영 자료는 사용하지 않았다.

| 절차 | 모드·입력 | 2차 최종 결과 |
| --- | --- | --- |
| `npm test` | 임시 합성 저장소·회귀 테스트 | 22/22 통과 |
| `npm run lint` | JS 권장 규칙·TS parser·React Hooks 호출 및 의존성 | 오류 0·경고 0 |
| `npm run type-check` | 최종 TypeScript 변경 트리 | 통과 |
| `npm run build` | Next.js production 및 postbuild 산출물 guard | exit 0·Next.js 경고 0·패키징 정책 통과 |
| `npm run test:http` | 최소 standalone·실제 로컬 서명 쿠키·multipart·23개 합성 글 | 62개 assertion 통과 |
| `npm audit` | 2026-10-23 최종 의존성 그래프·조회 시점 DB | 모든 심각도 0건 |
| `git diff --check` | 최종 변경 트리 | 통과 |
| 실제 브라우저 UI·Google OAuth·운영 프록시·실제 데이터 | 이전 경계 유지 | 미실행·UI 승인 대기 |

[저장 회귀](../tests/storage.test.cjs)는 4개 프로세스×20개의 사용자·댓글·조회 기록·카운터
80개 보존, 날짜가 달라도 전역 글 ID 하나만 생성, 합성 rename 실패 시 원본·잠금·임시 파일
상태, 손상 JSON 보존, 오래된 수정의 현재 조회수·소유자 보존, 재생성 글의 오래된 삭제 요청 거부를 확인했다.
조회 기록과 카운터 변경·삭제 시 소유자 재확인은 같은 로컬 쓰기 잠금 안에 둔다.
실제 저장 실패를 성공 응답으로 숨기지 않도록 수정했다.
실제 전원 차단·프로세스 kill·다중 파일 rollback은 검증하지 않았다.

최신 HTTP는 1차의 인증·권한·공개 DTO·헤더·multipart 검증에 산출물 내
소스·runtime 데이터·`.env`·로그 부재, 신규 업로드 소유권 등록·다른 작성자 첨부 참조 403,
없는 글 조회·정상 조회·중복 조회를 더했다. 악성 ID·날짜 입력 거부는 모킹 API·저장소 회귀의
검증 범위이며 실제 HTTP로 검증했다고 확대하지 않는다. 임시 runtime·서버는 finally에서 정리했다.

lint는 ESLint 10.13.0, @eslint/js 10.0.1, TypeScript parser 8.72.0,
React Hooks 7.1.1을 사용한다. 공지된 의존성 문제를 유입한 Next.js 플러그인은 제거했고
이 구성을 Next.js 전용 lint 전체의 통과로 해석하지 않는다.
Hook 의존성은 안정된 번역 callback·useCallback 등으로 수정하고 TypeScript lib는 es2022로 맞췄다.

최소 standalone 루트는 `.next`, `node_modules`, `package-lock.json`, `package.json`, `server.js`다.
`next.config.ts`는 runtime·비밀·프로젝트 소스의 추적 제외 경계를 명시한다.
instrumentation이 여전히 복사한 로그는 [산출물 guard](../scripts/check-standalone.cjs)가
생성된 `.next/standalone` 안에서만 제거하며 원본 데이터·로그는 지우지 않는다.
실행에 필요한 정적 자산과 합성 자료는 HTTP harness에서 별도로 제공했다.

중간 설정에서 광범위한 lib 제외가 외부 NextAuth JS를 빠뜨리고 guard CLI 자체가 trace된 것을
산출물·HTTP 검사가 발견했다. 제외 범위를 TS 확장자·정확한 파일명으로 좁혀 해결했다.
현재 실패로 남기지 않으며 최종 성공은 위의 최신 재빌드·HTTP 결과를 근거로 한다.
최종 임시 원출력은 `/tmp/blog-phase2-build.log`, `/tmp/blog-phase2-audit.json`이었다.
재사용 절차는 저장소의 테스트와 guard이며 임시 로그의 지속 보존을 전제로 하지 않는다.

신규 업로드의 소유권 index와 비삭제 참조 진단은 구현했다.
기존 소유권 추론·마이그레이션·보관 기간별 자동 삭제는 수행하지 않았다.
공유 로컬 파일시스템의 동기 쓰기와 파일 단위 교체가 이번 저장 보장 범위다.
다중 파일 crash 복구·전원 차단 내구성·다중 호스트·NFS·백업은 STORE-002로 남겼다.
브라우저 승인 재시도·우회와 실제 운영 변경도 수행하지 않았다.

2차 내용 검토는 현재 코드·검증 근거와 설명의 일치, 열린 TODO의 완료 조건·미완료 이유,
기존 고유 근거 보존과 정본 중복을 확인했다. 1차 검사 결과는 당시 상태로 보존했다.
이번 형식 검사 명령은 1차와 같은 승인된 원본 검사기·`--changed`이며 이번 회차에서 1회 실행한다.

2차 형식 검사 결과: 이번 회차 1회 실행·exit 0. Markdown 10개 검사에서
깨진 상대 링크·표 열 수·끊긴 표·등록부 도달성 오류와 긴 줄·앵커·TODO 완료 항목 경고 모두 0개였다.
이는 형식 오류 없음이며 내용 검토는 위의 별도 절차로 완료했다.

## 3차 독립 개선·커밋 승인 진행

사용자가 현재 수정의 커밋과 GitHub `main` 푸시를 명시 승인하고,
남은 TODO 중 독립적으로 구현 가능한 부분도 계속 완료하도록 요청했다.
기본 규칙은 승인 범위의 빌드·검증을 완료한 뒤 커밋·푸시하는 것이다.
운영 배포·NAS 변경·실제 데이터 자동 변경과 브라우저 승인 우회는 허용하지 않는다.

현재 코드 담당은 원격 기준 상태와 기존 22개 테스트·HTTP 62개 assertion에 해당하는
변경을 확인한 뒤 첫 커밋·푸시를 준비하고 후속 SEC-004 등의 독립 구현을 진행한다.
문서 담당은 승인 범위와 TODO의 독립 구현·운영 결정 경계만 먼저 갱신했다.
커밋 SHA·푸시 성공·원격 `main` 상태·CI 결과는 확인 대기이며 성공을 추정하지 않는다.
최종 후속 변경의 검증 근거를 받은 뒤 현재 정본을 동기화하고 이번 형식 검사를 1회 실행한다.
1·2차 코드·문서 검사 결과는 해당 당시 상태로 보존한다.

## 완료 이력

| ID | 변경과 확인 근거 |
| --- | --- |
| SEC-001 | 설정 변경에 세션·현재 관리자 역할 검사, 글 변경·업로드·관리 API에 현재 역할 재확인과 교차 Origin 차단. Google 확인 이메일 검사·세션에서 OAuth 토큰 제거. 함수 회귀 및 로컬 서명 쿠키의 강등 후 거부 검증 |
| SEC-002 | 글 ID·날짜·본문·태그·첨부 검증, 중복 생성 409·정확한 ID 조회·재귀 ID 열거. 신규 첨부 웹 정적 폴더 밖 저장·무작위 이름·MIME/확장자/매직 검사·실경로 확인·다운로드 sandbox. 공유 첨부 오삭제 방지를 위해 글 삭제 시 파일 자동 삭제 중단 |
| DATA-001 | 서버 검색·태그·페이지별 요약 DTO, 공개 글·댓글에서 작성자 이메일 제거, 서버 계산 capability로 관리 UI 유지. 합성 23글·최대 10글 페이지 검증 |
| SEC-003 | 공통 nosniff·프레임 차단·referrer·CSP 및 파일 sandbox 헤더, 레거시 /uploads API rewrite 추가. 로컬 HTTP 범위 검증, 운영 프록시 별도 확인 |
| DEP-001 | 공지와 조건 대조 후 lockfile 의존성 갱신. 최종 audit 0건. 소스의 Pages Router 조건과 운영 배포 미확인을 구분 |
| DOC-001 | 루트 진입점·docs 정본 책임 구축과 기존 고유 자료 보존. 내용 검토와 원본 형식 검사 결과는 위 절 참조 |
| STORE-001 | 공유 로컬 파일시스템 쓰기 잠금·파일 원자 교체, 조회수·소유자 보존과 삭제 재검사. 2차 저장 회귀 6개 통과. STORE-002 운영 경계는 미완료 |
| BUILD-001 | Next.js 추적 경고 10→0, runtime·비밀·프로젝트 소스 제외와 생성 산출물 guard. 최신 build와 최소 standalone HTTP 62개 assertion 통과 |
| UPLOAD-001 · 부분 | 신규 업로드 소유권 index·다른 작성자 신규 참조 거부·비삭제 참조 진단 구현. 기존 자료·보관·실제 회수 정책은 열린 TODO 유지 |
| LINT-001 | 재사용 가능한 lint 구성·명령 추가와 Hook 의존성 교정. 지원 Node.js·검사 범위를 명시하고 2차 lint 통과 |
| DATA-002 | 조회수 API에 유효한 ID·실존 글·Origin 검사. 없는 글은 기록 파일을 생성하지 않고 정상 중복 조회 흐름 유지 |

검증 범위는 위의 자동·로컬 HTTP 절차다. 실제 브라우저·Google OAuth·운영 반영 완료를 뜻하지 않는다.
