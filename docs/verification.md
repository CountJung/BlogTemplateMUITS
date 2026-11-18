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

## 3차 독립 개선·커밋 승인 검증

사용자가 현재 수정의 커밋과 GitHub `main` 푸시를 명시 승인하고,
남은 TODO 중 독립적으로 구현 가능한 부분도 계속 완료하도록 요청했다.
기본 규칙은 승인 범위의 빌드·검증을 완료한 뒤 커밋·푸시하는 것이다.
운영 배포·NAS 변경·실제 데이터 자동 변경과 브라우저 승인 우회는 허용하지 않는다.

1·2차 개선은 커밋
[`b68092d39f177ce477b851a5df4a0aaf4fd13139`](https://github.com/CountJung/BlogTemplateMUITS/commit/b68092d39f177ce477b851a5df4a0aaf4fd13139)로
기록한 뒤 force 없이 `main`에 푸시했다. 푸시 후 `ls-remote`의 `main` SHA 일치를 확인했다.
그 시점 해당 SHA의 GitHub Actions REST 조회는 `total_count: 0`, combined statuses는 빈 목록이었다.
이는 확인된 CI 실행이 없다는 결과이며 CI 통과로 해석하지 않는다.
초기 stage 검사에서 과거 업데이트 파일의 EOF 빈 줄을 정리했다. 원문 고유 내용은 유지했다.

아래는 위 커밋 이후 독립 개선의 최종 미커밋 변경 트리 검증이다.
환경은 앞 회차와 같은 macOS·Node.js v26.3.0·npm 11.16.0이다.
의존성 변경은 없으며 잠금 파일 SHA-256은 2차와 동일하다.

| 절차 | 모드·입력 | 3차 최종 결과 |
| --- | --- | --- |
| `npm test` | 임시 합성 입력·저장소·API 회귀 | 33/33 통과 |
| `npm run lint` | 현재 ESLint·Hooks 규칙 | 오류 0·경고 0 |
| `npm run type-check` | 최종 TypeScript 변경 트리 | 통과 |
| `npm run build` | production·standalone guard | exit 0·Next.js 경고 0·패키징 정책 통과 |
| `npm run test:http` | 동일 최종 빌드·실제 로컬 서명 쿠키·multipart·23개 합성 글 | 75개 assertion 통과 |
| `git diff --check` | 최종 코드 변경 | 통과 |
| 실제 브라우저·Google OAuth·운영 프록시·실제 데이터 | 기존 범위 유지 | 미실행·UI 승인 대기 |

HTTP 최종 75개 assertion은 앞 회차 검증에 전달 IP 위조로 제한을 피하지 못함,
조회수·파일·댓글 조회·댓글 쓰기·업로드·글 변경의 6개 scope 각각 429,
다른 댓글 계정의 독립 201, 서명만 맞춘 불완전 ZIP 400을 더했다.
`Retry-After`·`no-store` 헤더는 조회수 429 응답에서 직접 검사했다.
이번 회차 중간 67개 결과를 최종 수치로 사용하지 않는다.
마지막 HTTP harness 확장은 제품 코드 변경 없이 동일한 최종 빌드를 재사용했다.

[IP·제한 회귀](../tests/rate-limit.test.cjs)는 기본 socket IP·명시적 proxy chain·잘못된 체인의
fallback, 창 만료·bucket 상한·제한 설정과 report-only CSP 헤더를 확인한다.
잘못된 창·제한 값이 기본 240회를 허용한 뒤 241번째 요청을 거부하는 추가 회귀도 통과했다.
요청 제한은 프로세스 메모리에 한정하며 운영 신뢰 프록시와 분산 제어는 미검증이다.
[압축 회귀](../tests/archive.test.cjs)는 무추출 ZIP·OOXML 구조, 확장 한도,
경로·중복·암호화·CRC 등 비정상 입력을 검증한다. 바이러스·활성 문서 검사는 아니다.
[저장 진단 회귀](../tests/storage-health.test.cjs)는 내용 비노출·JSON 구문·임시 파일·symlink·
잠금 소유자 진단과 합성 SIGKILL 후 잠금이 남는 동작을 확인했다.
진단은 자동 복구·삭제를 하지 않으며 다중 파일 rollback·실제 전원 차단을 보장하지 않는다.

최신 빌드에서는 새 진단 CLI가 trace되는 것을 standalone guard가 탐지하여
정확한 파일명 제외로 해결한 뒤 다시 통과했다. 잘못 입력한 `typecheck` 명령은 실패했고
실제 스크립트인 `type-check`를 실행해 통과했다. 둘 다 현재 제품 장애로 남기지 않는다.
빌드 임시 원출력은 `/tmp/blog-phase3-build.log`다. 2차 audit 0건 이후 의존성 그래프는
바뀌지 않았으며 이를 새 시점의 DB 재조회라고 기록하지 않는다.

엄격 CSP는 빌드 시 `CSP_STRICT_REPORT_ONLY=1`로 선택하는 후보 보고 전용 옵션이다.
기본값은 0, 외부 보고 endpoint는 없고 기존 강제 CSP는 유지한다.
실제 브라우저·콘텐츠의 호환성은 검증하지 않았다.
신규 로컬 제어와 구분한 잔여 사용자 결정·운영 검증·배포 금지 조건은
[TODO](TODO.md)에 유지한다. 이 절은 커밋 전 변경 트리의 검증 기록이며
후속 커밋·원격 일치는 Git 이력과 원격 `main` 참조로 확인한다.

3차 내용 검토는 현재 코드·검증 근거와 설명의 일치, TODO의 완료 조건·운영 결정 경계,
기존 고유 근거 보존과 정본 중복을 확인했다. 이전 회차 검사 결과는 당시 상태로 보존했다.
이번 형식 검사는 앞서 승인한 원본 검사기의 `--changed`를 이번 회차 1회 실행한다.

3차 형식 검사 결과: 이번 회차 1회 실행·exit 0. Markdown 10개 중 변경 문서 3개를 대상으로
깨진 상대 링크·표 열 수·끊긴 표·등록부 도달성 오류와 긴 줄·앵커·TODO 완료 항목 경고 모두 0개였다.
이후 fallback 회귀 1개 추가에 맞춰 테스트 수를 33개로 갱신했으며 링크·표 구조는 바꾸지 않았다.
형식 검사는 반복하지 않았고 내용 검토는 위의 별도 절차로 완료했다.

## 2026-11-17 외장 작업본 보안 패치 검증

외장 프로젝트 폴더에 기존 작업본이 없음을 확인한 뒤 GitHub `main`의
`40bfcd11e362525eb67e2365deaedb9934bdd1b1`에서 새로 복제했다.
기존 사용자 작업본·변경은 덮어쓰지 않았다. 검증 환경은 macOS·Node.js v26.12.1·npm 11.20.0이다.

[Next.js 공식 보안 공지 GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2)의
영향 범위(16.0.0–16.4.4)와 수정 버전(16.4.5)을 대조했다.
Next.js를 16.4.1에서 같은 minor의 16.4.6으로 올리고 선언 범위를 `~16.4.6`으로 고정했다.
이는 self-hosted 이미지 최적화의 SVG 처리 관련 패치이며 실제 배포 버전이 갱신됐다는 의미는 아니다.

`npm audit fix --ignore-scripts`로 호환 범위의 개발 도구 의존성을 보완했다.
11개 변경·3개 추가·2개 제거 후 총 397개 패키지 audit에서 취약점 0건을 확인했다.
주요 결과는 ESLint 10.15.0·TypeScript ESLint parser 8.73.0·minimatch 11.0.9이다.
최종 잠금 파일로 `npm ci --ignore-scripts`를 재실행해 설치 재현성과 audit 0건을 확인했고,
lint·타입·33개 단위 회귀도 다시 통과했다.
audit 결과는 조회 시점의 알려진 취약점 기준이며 모든 보안 결함이 없다는 보장은 아니다.

| 절차 | 입력·범위 | 이번 결과 |
| --- | --- | --- |
| `npm test` | 임시 합성 입력·저장소·API 회귀 | 33/33 통과 |
| `npm run lint` | 현재 ESLint 규칙 | 오류 0·경고 0 |
| `npm run type-check` | 최종 TypeScript 변경 트리 | 통과 |
| `npm run build` | production·standalone 패키징 정책 | 통과 |
| `npm run test:http` | 격리 standalone·합성 23글·로컬 서명 세션·multipart | 79개 assertion 통과 |
| 독립 코드 리뷰 | 최신 lockfile의 Node 호환·HTTP 회귀 변경 | 차단 결함 없음 |
| Hermes 교차 검토 | Gateway 접근 시도 | `Gateway inaccessible: authorization`으로 미실행·독립 리뷰로 대체 |
| 실제 배포·NAS 변경·실제 OAuth·운영 자료 | 이번 요청 범위 밖 | 미실행 |

[HTTP 회귀](../tests/http-smoke.cjs)는 기존 75개 검사에 4개를 추가했다.
격리 임시 public 폴더의 스크립트·외부 참조 없는 합성 SVG에 대해 이미지 최적화 응답 400과
`not allowed` 메시지, 합성 PNG에 대해 200과 `image/*` Content-Type을 확인했다.
정상 PNG 허용과 기본 SVG 거부 정책의 회귀이며 공지의 우회 payload나 공격 재현 검사는 아니다.
실제 브라우저·운영 프록시·운영 이미지 endpoint 및 실제 Google OAuth는 검증하지 않았다.
배포 버전·환경과 실제 운영 확인은 [OPS-001·OPS-002](TODO.md)에 남긴다.

이번 결과는 `/tmp/blog-{test,lint,type,build,http}-20261117.log`의 실행 기록과 대조했다.
이전 회차의 성공 수치를 이번 검증으로 재사용하지 않았다.
커밋·원격 반영과 CI 결과는 이 절의 로컬 검증과 별도로 확인해야 한다.

문서 내용 검토는 새 검증 근거와 설명의 일치, 기존 고유 이력 보존, TODO의 운영 경계를 확인했다.
원본 docs-canon 검사기는 로컬 스킬 경로에서 찾지 못했다.
대신 이번 변경 문서 2개의 상대 링크 대상 존재와 Markdown 표 열 수를 제한된 대체 검사로 1회 확인했다.
이 대체 검사는 원본 검사기의 앵커·등록부 도달성·전체 문서 규칙을 검증한 결과가 아니다.

## 2026-11-18 노트북 로컬 스택 검증

기준은 Windows x64 노트북의 작업 트리(HEAD `7165ed1`)다. 소스와 잠금 파일만 별도
임시 디렉터리에 복사해 빌드했고, 실제 `.env`·계정·게시글·첨부는 검증에 사용하지 않았다.

- Volta의 프로젝트별 Node.js 26.13.1 LTS/npm 12.2.3 고정과 strict peer `npm ci` 확인.
- MUI·아이콘 9.5.0, TypeScript 6.0.3, ESLint 10.15.0 및 기타 직접·간접 의존성 갱신.
  Next.js 16.4.6·React 19.3.1·NextAuth 4.24.15는 조회 당시 이미 최신 안정판이다.
  TypeScript 7.0.2는 사용 중인 ESLint 파서 8.73.0의 지원 범위 밖이라 적용하지 않았다.
- 타입 검사·lint 및 Windows 자동 테스트 33개 통과. 저장 진단은 Windows에서도 잠금과
  소유자 정보를 찾고, 테스트는 운영 파일 대신 임시 경로를 사용한다.
- Turbopack 프로덕션 빌드·standalone 패키징 검사와 별도 실행에서 HTTP assertion 81개 통과.
  자바스크립트 자산, 서명된 합성 세션, 글 검색·수정, 댓글·첨부·권한을 확인했다.
- Windows 개발 서버의 홈·로그인·언어 API가 HTTP 200을 반환했다.
  별도 Chromium에서 1366×900과 390×844로 목록·검색·페이지 이동·글 상세·언어·다크 테마의
  새로고침 유지·모바일 메뉴의 키보드 로그인 이동을 확인했다. 최종 시나리오의 콘솔 오류·경고 및
  로컬 4xx 이상 응답은 0건이었다. 실제 Google 인증은 실행하지 않았다.
- `npm audit --omit=dev` 0건. 전체 감사는 개발 도구에서 `picomatch` 4.0.7 한 건의
  공지와 의존 경로를 합해 높음 5개 항목을 보고했다. 패치가 배포되면 락파일과 감사를 다시 확인한다.
  최초 로컬 검증 회차에서는 강제 다운그레이드, 권한 확대, 배포와 푸시는 하지 않았다.

해당 노트북의 `%TEMP%/blog-local-20261118-d46e73d5`에 격리 빌드(당시 약 648 MiB)를 보존했다.
미리보기는 LOCAL-002에서 종료했다. 잔여 합성 런타임은 같은 `%TEMP%` 아래
`blog-http-HxA9vU`, `blog-http-5YjtiE`, `blog-http-FMxNqd`(각 약 31 MiB)이며 실행에 쓰지 않는다.
재검증에 더 이상 필요하지 않을 때 승인 범위에서 정리한다.
프로젝트의 `node_modules`(약 452 MiB)는 로컬 개발 실행에 사용하므로 유지한다.

후속 커밋 전에는 `0959da9` 이후의 커밋 대상 소스를 기존 격리 사본(재검증 후 651.02 MiB)에 내보내
Node.js 26.13.1/npm 12.2.3으로 빌드·standalone 패키징·타입·린트·자동 테스트 35개·HTTP 검사 81개를
다시 통과했다. `npm audit --omit=dev`는 0건이다. 검증 셸이 미설정 OAuth URL을 빈 문자열로 전달해
첫 빌드가 실패했으며, 미설정 상태로 다시 실행해 통과했다. GUI·실제 OAuth·배포는 재실행하지 않았다.

## 2026-11-18 VS Code 디버깅 포트 충돌

- 기존 합성 미리보기의 Next standalone 프로세스가 `127.0.0.1:65002`를 점유한 상태에서
  개발 서버를 실행해 `EADDRINUSE`를 재현했다. 그 미리보기만 종료해 포트를 비웠다.
- 개발·Google OAuth의 65002를 유지하고 합성 미리보기 `npm start`를 65003으로 분리했다.
  VS Code는 Next CLI를 직접 디버그하고 `Ready in` 출력에서만 Chrome 디버거를 시작하도록 구성했다.
- Windows x64, HEAD `7165ed1` 위에 이번 커밋 대상만 내보낸 사본에서 Node.js 22.22.0/npm 11.13.0으로
  strict peer 설치·린트·프로덕션 빌드·standalone 패키징·디버그 설정 테스트 2개 통과.
  HTTP 회귀는 요청별 연결을 분리한 뒤 격리 standalone에서 81개 검사를 2회 통과했다.
  초기 병렬 실행에서 한 번 발생한 `ECONNRESET`의 원인은 단정하지 않는다.
- 실제 Next 자식 프로세스의 로컬 Node Inspector 연결과 홈·로그인·언어 API HTTP 200을 확인했다.
  개발 65002와 합성 미리보기 65003은 동시에 루프백으로 응답했고,
  각 포트의 중복 실행은 실패하면서 기존 PID를 보존했다. 테스트 종료 후 두 포트가 비어 있음을 확인했다.
- 기존 전체 Windows 테스트의 저장 정책·임시 폴더 정리 실패는 변경 전 HEAD에서도 관찰됐다.
  별도의 업그레이드 변경이 남아 있는 작업 트리에서는 Node.js 26.13.1로 전체 35개·타입·린트가 통과했다.
  이 결과를 커밋 대상의 전체 테스트 통과로 계산하지 않는다.
- VS Code GUI의 F5와 Chrome 자동 시작·종료는 직접 조작하지 않았다. 실제 OAuth·운영 데이터·배포는 미실행이다.

로컬 재검증용 사본은 `%TEMP%/blog-debug-20261118-5fb681c8`(644.58 MiB),
비교용 HEAD 사본은 `%TEMP%/blog-debug-20261118-5fb681c8-head`(0.60 MiB,
위 사본의 의존성 junction 제외)다. 모두 종료 상태이며, 재검증이 끝나면 승인 범위에서 정리한다.

## 완료 이력

| ID | 변경과 확인 근거 |
| --- | --- |
| LOCAL-002 | 개발·OAuth 65002와 합성 미리보기 65003을 분리하고 VS Code 브라우저 시작을 서버 준비에 연결. [디버깅 포트 충돌 검증](#2026-11-18-vs-code-디버깅-포트-충돌) 참조 |
| LOCAL-001 | Node.js 26 LTS·npm 12·MUI 9와 호환 도구 적용. [노트북 로컬 스택 검증](#2026-11-18-노트북-로컬-스택-검증) 참조 |
| SEC-001 | 설정 변경에 세션·현재 관리자 역할 검사, 글 변경·업로드·관리 API에 현재 역할 재확인과 교차 Origin 차단. Google 확인 이메일 검사·세션에서 OAuth 토큰 제거. 함수 회귀 및 로컬 서명 쿠키의 강등 후 거부 검증 |
| SEC-002 | 글 ID·날짜·본문·태그·첨부 검증, 중복 생성 409·정확한 ID 조회·재귀 ID 열거. 신규 첨부 웹 정적 폴더 밖 저장·무작위 이름·MIME/확장자/매직 검사·실경로 확인·다운로드 sandbox. 공유 첨부 오삭제 방지를 위해 글 삭제 시 파일 자동 삭제 중단 |
| DATA-001 | 서버 검색·태그·페이지별 요약 DTO, 공개 글·댓글에서 작성자 이메일 제거, 서버 계산 capability로 관리 UI 유지. 합성 23글·최대 10글 페이지 검증 |
| SEC-003 | 공통 nosniff·프레임 차단·referrer·CSP 및 파일 sandbox 헤더, 레거시 /uploads API rewrite 추가. 로컬 HTTP 범위 검증, 운영 프록시 별도 확인 |
| DEP-001 | 공지와 조건 대조 후 lockfile 의존성 갱신. 최종 audit 0건. 소스의 Pages Router 조건과 운영 배포 미확인을 구분 |
| DEP-002 | 2026-11-17 Next.js 16.4.6 보안 패치·개발 도구 audit 0건·합성 SVG 거부 및 PNG 허용 HTTP 회귀. 위 신규 절의 로컬 검증 범위이며 운영 배포는 미실행 |
| DOC-001 | 루트 진입점·docs 정본 책임 구축과 기존 고유 자료 보존. 내용 검토와 원본 형식 검사 결과는 위 절 참조 |
| STORE-001 | 공유 로컬 파일시스템 쓰기 잠금·파일 원자 교체, 조회수·소유자 보존과 삭제 재검사. 2차 저장 회귀 6개 통과. STORE-002 운영 경계는 미완료 |
| BUILD-001 | Next.js 추적 경고 10→0, runtime·비밀·프로젝트 소스 제외와 생성 산출물 guard. 최신 build와 최소 standalone HTTP 62개 assertion 통과 |
| UPLOAD-001 · 부분 | 신규 업로드 소유권 index·다른 작성자 신규 참조 거부·비삭제 참조 진단 구현. 기존 자료·보관·실제 회수 정책은 열린 TODO 유지 |
| LINT-001 | 재사용 가능한 lint 구성·명령 추가와 Hook 의존성 교정. 지원 Node.js·검사 범위를 명시하고 2차 lint 통과 |
| SEC-004 · 로컬 | socket IP 기본·명시적 proxy chain·프로세스별 제한과 실제 6개 API scope 429 회귀 구현. 운영 값·분산 제한 결정은 열린 TODO 유지 |
| UPLOAD-002 · 부분 | ZIP·OOXML 무추출 구조·확장·경로·CRC 검사와 비정상 합성 입력 회귀 구현. 바이러스·활성 문서 정책은 열린 TODO 유지 |
| STORE-002 · 부분 | 내용 비노출 읽기 전용 저장 진단·SIGKILL 잠금 잔존 회귀 구현. 자동 복구·다중 파일·전원 차단·운영 백업은 열린 TODO 유지 |
| CSP-001 · 부분 | 후보 엄격 CSP의 빌드 시 report-only 옵션·헤더 회귀 구현. 실제 브라우저 호환·강제 정책 선택은 열린 TODO 유지 |
| DATA-002 | 조회수 API에 유효한 ID·실존 글·Origin 검사. 없는 글은 기록 파일을 생성하지 않고 정상 중복 조회 흐름 유지 |

검증 범위는 위의 자동·로컬 HTTP 절차다. 실제 브라우저·Google OAuth·운영 반영 완료를 뜻하지 않는다.

## 2026-11-18 운영 시작 명령 복원

- `npm start`를 `next start -p 65002`로 복원하고 합성 실행은 `npm run preview`로 분리했다.
- 일반 `npm run build`는 `.next`, `npm run build:standalone`은 `.next-standalone`을 생성한다.
  일반 시작을 standalone 산출물에 연결하지 않는다. standalone 검증·미리보기의 내부 정적 자산 경로도
  custom distDir에 맞췄다. 빌드 wrapper는 모드 환경값을 명시하고 standalone 빌드 후 기본 타입 선언을 보존한다.
- `.next-standalone`은 Git·ESLint·일반 TypeScript 탐색에서 제외한다. 기존 저장소의 데이터·비밀값은 변경하지 않았다.
- macOS arm64에서 공식 Node 배포본의 SHA-256을 확인하고 임시 폴더의 Node 26.13.1/npm 12.2.3으로 검증했다.
  시스템 Node/npm 및 사용자 설정은 변경하지 않았다. `npm ci --ignore-scripts` 성공.
- 단위 테스트 36개, lint, type-check, 일반 빌드, standalone 빌드와 패키징 검사 통과.
  일반 `next start` 합성 HTTP 81개, standalone 합성 HTTP 81개 통과.
  standalone 빌드 후 일반 HTTP 81개를 재실행하여 기존 `.next`의 동작도 확인했다.
  두 빌드 메타데이터의 distDir/output 및 기본 `next-env.d.ts` 유지도 확인했다.
- 합성 미리보기 `127.0.0.1:65003` 준비 및 SIGTERM 종료 코드 0 확인.
  실제 OAuth·NAS·운영 데이터·실제 운영 포트 재시작은 실행하지 않았다.
  일반 HTTP 검증은 임시 폴더의 합성 데이터와 임시 포트에서 `next start`를 실행한다.
  `npm start`의 65002 매핑은 스크립트 계약 테스트로 확인하며 운영 포트를 점유하지 않는다.
- 독립 리뷰에서 발견한 custom distDir 내부 경로와 생성물 lint 대상 문제를 수정했다.
  새 문서의 상대 링크·Markdown 표 및 `git diff --check`를 제한적으로 검사했다.
  docs-canon 원본 검사기 전체 검증을 수행한 것으로 해석하지 않는다.
