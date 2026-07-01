# seowon-client-api

서원대학교 e-campus(LMS) 화면 흐름과 HTTP 요청을 코드로 다루기 위한 비공식 TypeScript 클라이언트 및 CLI 도구 모음입니다.

로그인/쿠키 세션 유지, 과목 조회, 공지/강의자료/과제 조회, 이러닝 차시 분석, MP4 URL 추출, 영상 다운로드, 학습 기록 갱신, 성적 요약 조회, Fiddler SAZ 패킷 분석을 지원합니다.

> 이 프로젝트는 서원대학교 공식 SDK가 아닙니다. 계정 정보, 쿠키, 세션, LMS 캡처 데이터, 다운로드 파일은 민감 정보로 취급하고 공개 저장소에 올리지 마세요.

## 주요 기능

- e-campus 로그인용 `encryptData` 생성 및 쿠키 세션 저장/재사용
- 교과/비교과 과목 목록과 그룹 조회
- 공지사항, 강의자료, 과제 목록 조회
- 강의자료 상세 fragment 분석 및 첨부 파일 다운로드 URL 추출
- 이러닝 주차/차시, 수강 기간, 출결 상태 파싱
- 콘텐츠 페이지에서 MP4 주소 추출 및 스트리밍 다운로드
- 단일 또는 복수 차시의 학습 기록 갱신 자동화
- 현재 기간 내 미완료 이러닝 자동 탐색
- 현재 제출 가능한 미제출 과제 목록과 과제 본문 조회
- 성적 공개 여부, 설문 게이트, 항목별 점수, 총점, 등급 조회
- Fiddler SAZ 패킷에서 classroom, elearning, score 응답 복원
- Puppeteer 기반 live traffic capture 보조 도구

## 요구 사항

- Node.js `20+`
- npm
- Windows PowerShell 기준으로 개발 및 확인

## 빠른 시작

```bash
npm install
```

`.env.example`을 참고해 프로젝트 루트에 `.env`를 준비합니다.

```env
SEOWON_ID=your_id
SEOWON_PASSWORD=your_password
DOWNLOAD_HIGH_WATER_MARK=1024
```

| 환경 변수                  | 설명                                  |
| :------------------------- | :------------------------------------ |
| `SEOWON_ID`                | 로그인 아이디 또는 학번               |
| `SEOWON_PASSWORD`          | 로그인 비밀번호                       |
| `DOWNLOAD_HIGH_WATER_MARK` | 다운로드 버퍼 크기(KB), 기본값 `1024` |

로그인 성공 후 쿠키는 `.seowon-ecampus.cookies.json`에 저장됩니다. 이후 실행에서는 유효한 쿠키가 있으면 기존 세션을 재사용합니다.

## CLI 도구

| 도구            | 실행 명령               | 용도                                                  |
| :-------------- | :---------------------- | :---------------------------------------------------- |
| `prompt-client` | `npm run prompt:client` | API 응답과 파싱 결과를 기능별로 직접 확인             |
| `auto-manager`  | `npm run auto:manager`  | 다운로드, 자동 시청, 과제/성적 조회 등 반복 작업 처리 |

### prompt-client

```bash
npm run prompt:client
```

지원 명령:

- `login`: 로그인 및 쿠키 저장
- `courses`: 전체 과목 목록 출력
- `notices`: 선택 과목 공지사항 조회
- `materials`: 선택 과목 강의자료 조회
- `assignments`: 선택 과목 과제와 제출 상태 조회
- `classroom-resources`: 공지/강의자료/과제 통합 조회
- `elearning-lessons`: 선택 과목 이러닝 차시 목록 조회
- `elearning-open`: 선택 차시의 시청 창 메타데이터 조회
- `elearning-mp4`: 선택 차시의 MP4 주소 분석
- `elearning-download`: 선택 차시 영상 다운로드
- `elearning-watch`: 선택 차시 학습 세션 시작
- `help`: 도움말 출력

### auto-manager

```bash
npm run auto:manager
```

현재 메뉴:

```text
1. 로그인 / 로그인 정보 갱신
2. 이러닝 일괄 다운로드 (전체 대기열 시각화)
3. 이러닝 순차 자동 시청 (고급 로그 제어)
4. 전체 교과목 미제출 과제 전수 조사
5. 전 과목 기간 내 미완료 이러닝 자동 시청
6. 현재 수행 가능한 전 과목 미제출 과제 목록
7. 현재 수행 가능한 과제 선택 및 상세내용 보기
8. 강의자료 다운로드 (일괄 + 첨부 분석/미리보기)
9. 교과 과목 전체 성적(등급) 조회
0. 종료
```

여러 항목 선택은 쉼표 또는 범위로 입력할 수 있습니다.

```text
번호들을 쉼표 또는 범위로 입력 (예: 1,2,3-5): 1,3,4
```

다운로드 기본 저장 경로:

- 이러닝 영상: `downloads/<과목명>/<차시명>.mp4`
- 강의자료 첨부: `downloads/<과목명>/강의자료들/<강의자료명>/`

메뉴 `2`, `3`, `5`의 이러닝 목록과 대기 문구는 차시가 속한 주차를 `[n 주차]` 형식으로 표시합니다. 메뉴 `4`, `6`, `7`의 과제 제목도 가능한 경우 주차 표기를 정규화합니다.

## 주요 라이브러리 API

```typescript
import { createEcampusClient } from "seowon-client-api";

const client = createEcampusClient({
  cookieFilePath: "./cookies.json"
});

await client.login({
  userId: "your_id",
  password: "your_password"
});

const courses = await client.getCourseList();
const groups = await client.getCourseGroups();
```

### 강의실 리소스

```typescript
const notices = await client.getNoticeList({ crsCreCd: "COURSE_CODE" });
const materials = await client.getMaterialList({ crsCreCd: "COURSE_CODE" });
const attachments = await client.getMaterialAttachments(materials[0]);
const assignments = await client.getAssignmentList({
  crsCreCd: "COURSE_CODE",
  userNo: "USER_NO"
});

const resources = await client.getClassroomResources({
  crsCreCd: "COURSE_CODE",
  userNo: "USER_NO"
});
```

### 이러닝

```typescript
const lessons = await client.getElearningLessonList({
  crsCreCd: "COURSE_CODE"
});

const result = await client.getElearningMp4Url("COURSE_CODE", "LESSON_CONTENT_ID");
if (result.success) {
  console.log(result.mp4Url);
}

await client.downloadElearningMp4("COURSE_CODE", "LESSON_CONTENT_ID", "과목명", "차시명");
```

### 성적

```typescript
const scoreAccess = await client.getScoreAccessInfo({
  crsCreCd: "COURSE_CODE"
});

if (scoreAccess.canViewScore) {
  const scoreSummary = await client.getScoreSummary({
    crsCreCd: "COURSE_CODE"
  });

  console.log(scoreSummary.items);
  console.log(scoreSummary.total, scoreSummary.grade);
} else {
  console.log(scoreAccess.message);
}
```

성적 조회는 먼저 `scoreOpenJson`으로 공개 여부와 설문 게이트를 확인합니다. 실제 점수/등급은 성적 페이지 진입 후 hidden `stdNo`를 얻고 `/crs/scoreHome/viewStdScoreSumm` fragment에서 추출합니다.

### SAZ 패킷 분석

```typescript
import { parseEcampusScoreSummariesFromSaz, parseFiddlerSazSessions } from "seowon-client-api";

const sessions = parseFiddlerSazSessions(sazBuffer);
const scoreSummaries = parseEcampusScoreSummariesFromSaz(sazBuffer);
```

SAZ 파일 자체는 민감 캡처 데이터로 취급하며 기본적으로 Git에 포함하지 않습니다. 파서는 `src/ecampus/saz.ts`에서 관리합니다.

## 주요 공개 메서드

| 메서드                          | 설명                                              |
| :------------------------------ | :------------------------------------------------ |
| `login()`                       | 계정 정보로 로그인하고 쿠키 저장                  |
| `ensureAuthenticated()`         | 사용 가능한 쿠키가 없으면 저장된 계정으로 로그인  |
| `getCourseList()`               | 전체 과목 목록 조회                               |
| `getCourseGroups()`             | 교과/비교과 과목 그룹 조회                        |
| `getNoticeList()`               | 공지사항 조회                                     |
| `getMaterialList()`             | 강의자료 조회, 상세 조회용 `request` 포함         |
| `getMaterialAttachments()`      | 강의자료 상세 fragment에서 첨부 파일 URL 추출     |
| `downloadMaterialAttachments()` | 강의자료 첨부 파일 다운로드                       |
| `getAssignmentList()`           | 개인별 과제 목록과 제출 상태 조회                 |
| `getClassroomResources()`       | 공지/강의자료/과제 통합 조회                      |
| `getScoreOpenInfo()`            | 성적 공개 시간과 공개 여부 조회                   |
| `getScoreAccessInfo()`          | 성적 공개 조건과 설문 게이트 통합 판정            |
| `getScore()`                    | 성적 접근 가능 시 성적 페이지 HTML 조회           |
| `getScorePageHtml()`            | 성적 페이지 HTML 반환                             |
| `getScoreSummary()`             | 성적 요약 fragment에서 항목별 점수/총점/등급 조회 |
| `getElearningLessonList()`      | 이러닝 차시 목록 조회                             |
| `openLessonWindow()`            | 차시 시청 창 메타데이터 조회                      |
| `getElearningMp4Url()`          | 콘텐츠 페이지에서 MP4 주소 분석                   |
| `downloadElearningMp4()`        | 영상 스트리밍 다운로드                            |
| `addStudyRecord()`              | 단일 학습 기록 요청 전송                          |
| `viewLessonStudyDetail()`       | 학습 이력 상세 정보 조회                          |

## 프로젝트 구조

```text
src/
  index.ts                     패키지 공개 API
  cli-ui.ts                    CLI 색상, 입력, 진행 표시
  types/                       클라이언트/auto-manager 타입
  ecampus/
    login.ts                   EcampusClient, HTTP 요청 헬퍼
    cookies.ts                 CookieJar 저장/복원/유효성 확인
    crypto.ts                  로그인 encryptData 생성
    courses.ts                 과목 목록 파싱
    classroom.ts               공지/자료/과제 HTML 파싱
    elearning.ts               이러닝 파싱, 다운로드, 학습 세션
    score.ts                   성적 공개/설문/요약 파싱
    saz.ts                     Fiddler SAZ 세션 복원과 SAZ 기반 파서
    types/                     기능별 타입
    legacy/login-crypto.cjs    생성된 로그인 암호화 모듈
scripts/
  build-legacy-crypto.cjs      로컬 NICE 원본 스크립트 기반 암호화 모듈 재생성
  copy-legacy.cjs              빌드 결과에 legacy 모듈 복사
  register-ts-node.mjs         CLI TypeScript 실행 로더
  analyze-saz.mjs              SAZ 분석 도구
  capture-live.mjs             visible Chrome 기반 live traffic capture 도구
prompt-client.js               개별 API 진단 CLI
auto-manager.ts                반복 작업 CLI
```

## 개발 명령

| 명령                    | 설명                                   |
| :---------------------- | :------------------------------------- |
| `npm run prompt:client` | 개별 API 진단 CLI 실행                 |
| `npm run auto:manager`  | 반복 작업 CLI 실행                     |
| `npm run analyze:saz`   | SAZ 패킷 분석                          |
| `npm run capture:live`  | visible Chrome으로 LMS 요청/응답 캡처  |
| `npm run typecheck`     | TypeScript 검사                        |
| `npm run format:check`  | Prettier 검사                          |
| `npm run lint`          | ESLint 검사                            |
| `npm test`              | Vitest 실행                            |
| `npm run build`         | legacy 암호화 모듈 준비 후 패키지 빌드 |

## 빌드와 로컬 원본 파일

`npm run build`, `npm test`, `npm run prepack`, `npm run test:login`은 먼저 `scripts/build-legacy-crypto.cjs`를 실행합니다.

이 스크립트는 Git에 포함하지 않는 로컬 NICE 원본 파일을 사용할 수 있습니다.

```text
files/ecam/ecamjs/nice.nuguya.oivs.crypto.js
files/ecam/ecamjs/nice.nuguya.oivs.util.js
files/ecam/ecamjs/nice.nuguya.oivs.msg.js
```

원본 파일이 있으면 `src/ecampus/legacy/login-crypto.cjs`를 재생성합니다. 원본 파일이 없고 기존 생성물이 있으면 기존 생성물을 재사용합니다.

## 로컬 파일과 보안

다음 파일과 폴더는 공개 저장소에 올리지 않습니다.

```text
.env
.seowon-ecampus.cookies.json
.seowon-ecampus.session.json
files/
downloads/
test/
*.saz
*.mp4
tmp-*.html
captures/
captures/live/
```

공개 저장소에 올리기 전 실제 계정 정보, 쿠키, 세션, LMS 캡처 데이터, 다운로드 파일이 포함되지 않았는지 반드시 확인하세요.

## 현재 검증 상태

2026-07-01 기준 최근 확인 명령:

```bash
npm run typecheck
npx tsc --ignoreConfig --noEmit --target es2022 --module nodenext --moduleResolution nodenext --esModuleInterop --skipLibCheck auto-manager.ts
npx prettier --check auto-manager.ts src/types/auto-manager.ts README.md
npx vitest run test/ecampus-score.test.ts
npm run build
```

`npm test` 전체 실행은 로컬 fixture가 없는 환경에서 일부 실패할 수 있습니다. 누락될 수 있는 fixture는 로그인 메인 HTML, 비교과/강의실 캡처, 일부 SAZ 원본 캡처 등 민감 데이터입니다.
