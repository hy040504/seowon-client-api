# seowon-client-api

서원대학교 e-campus(LMS), 수강**희망바구니**, 수강신청 **본신청** 화면 흐름·HTTP 요청을 코드로 다루기 위한 **비공식** TypeScript 클라이언트 및 CLI 모음입니다.

상세 변경 이력은 [`CHANGELOG.md`](./CHANGELOG.md)를 참고하세요.

## 지원 범위

| 영역                                    | 상태 | 비고 |
| :-------------------------------------- | :--- | :--- |
| e-campus 로그인/과목/강의실/이러닝/성적 | 지원 | `EcampusClient` |
| 수강**희망바구니** (예비 담기)          | 지원 | `HopeBasketClient` (`src/hope-basket/`) |
| 정식 수강신청 (**본신청** 등록/취소)    | 지원 | `CourseRegistrationClient` (`src/course-registration/`) |

> **희망바구니 ≠ 본신청.** 같은 서버(`sugangh.seowon.ac.kr`)를 쓰지만 menuId·API 경로·쿠키 파일이 다릅니다. 두 클라이언트를 혼용하지 마세요.

> 이 프로젝트는 서원대학교 공식 SDK가 아닙니다. 계정·쿠키·세션·LMS 캡처·다운로드 파일은 공개 저장소에 올리지 마세요.

## 최근 변경 요약

### 수강신청 본신청 모듈

- `src/course-registration/` 신규: 정식 수강신청(등록/취소/내 목록/연속 재시도)
- 공개 API: `CourseRegistrationClient` / `createCourseRegistrationClient`
- CLI: `npm run sugang:registration` (`course-reg:manager` 별칭)
- 서버 구분: menuId `M100780` / pgmId `P001619`, 쿠키 `.seowon-sugang.cookies.json`
- 단위 테스트 + 라이브 스모크(`npm run test:course-reg:smoke`, 등록/취소 미수행)

### 코드 최적화

- `src/utils.ts` 공통화: `normalizeBaseUrl`, `escapeRegExp`, `COMMON_AJAX_HEADERS`, `errorMessage`
- 쿠키 저장 비동기화(`saveCookieJarToFile` → Promise) 및 `createDebouncedCookieSaver`
- 타입 강화(`any` → `unknown`), 희망바구니 검색 `subjtNm` 컬럼 보정
- 미사용 `ts-node` 제거, 실행은 `tsx` 유지

### 프로젝트 루트 정리

| 이전 (루트 혼재) | 이후 |
| :--------------- | :--- |
| `*-manager.ts`, `prompt-client.js` | `cli/` |
| 구현 프롬프트·개선 메모·피드백 노트 | `docs/prompts/`, `docs/notes/`, `docs/feedback/` |
| `SAZ/` 패킷 원본 | `research/saz/` (gitignore, 로컬 전용) |
| 대형 `all-courses*.json` | `data/` (gitignore) |

CLI는 `npm run …` 으로 실행하면 경로를 외울 필요 없습니다. 쿠키 파일 기본 위치는 계속 **프로젝트 루트**입니다.

## 주요 기능

### e-campus (`ecampus.seowon.ac.kr`)

- 로그인용 `encryptData` 생성 및 쿠키 세션 저장/재사용
- 교과/비교과 과목 목록·그룹 조회
- 공지사항, 강의자료, 과제 목록 조회
- 강의자료 첨부 파일 URL 추출 및 다운로드
- 이러닝 주차/차시, 수강 기간, 출결 상태 파싱
- MP4 URL 추출, 스트리밍 다운로드, 학습 기록 갱신
- 성적 공개 여부, 설문 게이트, 항목별 점수/총점/등급 조회

### 수강희망바구니 (`sugangh.seowon.ac.kr`)

- 희망바구니 전용 로그인 (`appcsKindCd=100`)
- 개설 교과목 검색 (`findEstblSubjtGnrlList`)
- 내가 담은 희망바구니 목록 (`findEstblSubjtShpbsList`)
- 희망바구니 담기 / 취소
- 내 바구니 간이 시간표 (문자 데이터 파싱 기반; 학교 공식 시간표 원본은 미포함)
  - 시간표 이미지(SVG/HTML/PNG) 저장 및 자동 뷰어 실행 지원
  - 과목별 학점, 학과, 학번, 학기 등 세부 정보 표시 지원
- 관련 일정, 개설 학과, 교양 영역, 학과별 개설 시간표 조회
- Fiddler SAZ에서 희망바구니 세션 복원

정식 수강신청(본신청)은 아래 **별도 모듈**을 사용하세요. 희망바구니 경로에 본신청 API를 섞지 않습니다.

### 수강신청 본신청 (`sugangh.seowon.ac.kr`, menuId=`M100780`)

실제 수강 등록을 확정하는 **본신청** 전용 모듈입니다. (`src/course-registration/`)

| 항목 | 희망바구니 | 본신청 |
| :--- | :--- | :--- |
| menuId / pgmId | `M100779` / `P001609` | **`M100780` / `P001619`** |
| 등록 | `saveHopeAppcsDtls.do` | **`saveAppcsDtls.do`** |
| 취소 | `saveHopeAppcsDtlsCancl.do` | **`saveAppcsDtlsCancl.do`** |
| 내 목록 | `findEstblSubjtShpbsList.do` | **`findAppcsDtlsList.do`** |
| 로그인 | `appcsKindCd=100` | **appcsKindCd 미전송** |
| 쿠키 파일 | `.seowon-hope-basket.cookies.json` | **`.seowon-sugang.cookies.json`** |

- 본신청 로그인 (서버 과부하 시 `flag=0` 허위 실패 자동 재시도)
- 개설 교과목 검색 (`findEstblSubjtGnrlList`, menuId=`M100780`)
- 내 수강신청 목록 (`findAppcsDtlsList` → Dataset `dsSapl231`)
- 수강신청 등록 / 취소 (`saveAppcsDtls` / `saveAppcsDtlsCancl`)
- 등록 전 경고 장학생 체크 (`findWarnStdrInqryCscnt` → `saveWarnStdrInqrtCscnt`)
- 정원 초과 과목 **연속 재시도** (`registerCourseWithRetry`)
- 네트워크 오류(`ECONNRESET` / timeout) 지수 백오프 재시도

### 공통

- Fiddler SAZ 패킷 분석 (classroom / elearning / score / hope-basket)
- Puppeteer 기반 live traffic capture 보조 도구
- Nexacro SSV 코덱 공유 (`src/hope-basket/ssv.ts` — 본신청도 동일 프로토콜)
- 공통 유틸 (`src/utils.ts`): URL 정규화, 정규식 이스케이프, AJAX 공통 헤더, 에러 메시지 추출

## 요구 사항

- Node.js `20+`
- npm
- Windows PowerShell 기준으로 개발·확인

## 빠른 시작

```bash
npm install
```

`.env.example`을 참고해 프로젝트 루트에 `.env`를 만듭니다.

```env
SEOWON_ID=your_id
SEOWON_PASSWORD=your_password
DOWNLOAD_HIGH_WATER_MARK=1024
```

| 환경 변수                  | 설명                                |
| :------------------------- | :---------------------------------- |
| `SEOWON_ID`                | 로그인 아이디 또는 학번             |
| `SEOWON_PASSWORD`          | 로그인 비밀번호                     |
| `DOWNLOAD_HIGH_WATER_MARK` | 다운로드 버퍼 크기(KB), 기본 `1024` |

쿠키 파일:

| 파일                               | 용도                 |
| :--------------------------------- | :------------------- |
| `.seowon-ecampus.cookies.json`     | e-campus 세션        |
| `.seowon-hope-basket.cookies.json` | 희망바구니 세션      |
| `.seowon-sugang.cookies.json`      | **본신청** 세션 (별도) |

## CLI 도구

인터랙티브 CLI 소스는 `cli/` 아래에 있습니다. npm 스크립트로 실행하세요.

| 도구 | 경로 | 실행 명령 | 용도 |
| :--- | :--- | :--- | :--- |
| `prompt-client` | `cli/prompt-client.js` | `npm run prompt:client` | 기능별 API 응답/파싱 결과 확인 |
| `auto-manager` | `cli/auto-manager.ts` | `npm run auto:manager` | e-campus 다운로드·자동 시청·과제·성적 반복 작업 |
| `hope-basket-manager` | `cli/hope-basket-manager.ts` | `npm run hope-basket:manager` | 수강희망바구니(예비 담기) 전용 CLI |
| `course-registration-manager` | `cli/course-registration-manager.ts` | `npm run sugang:registration` | **수강신청 본신청** 전용 CLI |
| `db-generator` | `db-generator/generate.ts` | `npm run generate:db` | 전체 개설 과목 수집 및 JSON 저장 |
| `db-viewer` | `db-generator/viewer.ts` | `npm run view:db` | 생성된 과목 DB 검색 및 페이지네이션 뷰어 |

`npm run sugang:manager`는 `hope-basket:manager`의 별칭입니다.  
`npm run course-reg:manager`는 `sugang:registration`의 별칭입니다.

### prompt-client

```bash
npm run prompt:client
```

**e-campus**

| 명령                  | 설명                     |
| :-------------------- | :----------------------- |
| `login`               | 로그인 및 쿠키 저장      |
| `courses`             | 전체 과목 목록           |
| `notices`             | 선택 과목 공지           |
| `materials`           | 선택 과목 강의자료       |
| `assignments`         | 선택 과목 과제·제출 상태 |
| `classroom-resources` | 공지/강의자료/과제 통합  |
| `elearning-lessons`   | 이러닝 차시 목록         |
| `elearning-open`      | 시청 창 메타데이터       |
| `elearning-mp4`       | MP4 URL 분석             |
| `elearning-download`  | 차시 영상 다운로드       |
| `elearning-watch`     | 학습 세션 시작           |

**희망바구니 (본신청 아님)**

| 명령                       | 설명                    |
| :------------------------- | :---------------------- |
| `hope-basket-login`        | 희망바구니 로그인       |
| `hope-basket-search`       | 개설 과목 검색          |
| `hope-basket-add`          | 바구니 담기             |
| `hope-basket-my-list`      | 내가 담은 목록          |
| `hope-basket-my-timetable` | 내 바구니 간이 시간표   |
| `hope-basket-cancel`       | 바구니 취소             |
| `hope-basket-schedules`    | 관련 일정               |
| `hope-basket-departments`  | 개설 학과               |
| `hope-basket-domains`      | 교양 영역               |
| `hope-basket-timetable`    | 학과별 개설 전공 시간표 |
| `help`                     | 도움말                  |

구 별칭 `sugang-*` 도 동일 명령으로 연결됩니다.

### auto-manager

```bash
npm run auto:manager
```

e-campus 전용입니다. 희망바구니는 포함하지 않습니다.

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

여러 항목 선택: `1,3,4` 또는 `1-5` 형식.

다운로드 기본 경로:

- 이러닝: `downloads/<과목명>/<차시명>.mp4`
- 강의자료: `downloads/<과목명>/강의자료들/<강의자료명>/`

메뉴 `2`, `3`, `5`의 이러닝·대기 문구와 메뉴 `4`, `6`, `7`의 과제 제목은 가능하면 `[n 주차]` 형식으로 표시합니다.

### hope-basket-manager

```bash
npm run hope-basket:manager
```

**수강희망바구니(예비 담기) 전용**입니다. 정식 수강신청 본신청은 포함하지 않습니다.

```text
1. 로그인 / 세션 갱신
2. 개설 강의 검색
3. 희망바구니 검색 후 선택 담기
4. 희망바구니 취소
5. 내가 담은 희망바구니 목록
6. 본인 학과·학년 전공 일괄 담기 (전공 자동담기)
7. 내 희망바구니 시간표 이미지 (HTML/PNG)
8. 희망바구니 관련 일정 조회
9. 개설 학과 / 교양 영역 조회
10. 학과별 개설 강의시간표 조회 (내 시간표 아님)
0. 종료
```

네트워크 끊김(`ECONNRESET` 등) 시 자동 재시도하며, 로그인 단계별 진행 로그를 출력합니다.

**주요 개선 사항:**
- **시간표 이미지 자동 뷰어 실행**: 7번 메뉴로 시간표 이미지를 생성하면 OS 기본 뷰어(또는 웹 브라우저)로 이미지를 즉시 열어줍니다.
- **맞춤형 시간표 정보 제공**: 시간표 이미지 상단에 학번, 학과, 학년, 수강 학기 정보를 표시하며, 각 강의 블록 내부에 학점 정보를 시각적으로 배치(강의 시간에 따라 유동적 배치)합니다.
- **이해하기 쉬운 용어와 정보**: 내부 서버 코드(예: 07)를 2학년 등 사람이 읽기 쉬운 형태로 자동 변환해 보여주며, 난해한 사내 용어(`timtbNm`, `ClipReport`)를 쉬운 한국어로 풀어 설명합니다.
- **과목 검색 시 수업 속성(e러닝 등) 동시 표기**: 과목 검색 및 바구니 담기 메뉴(2, 3번) 이용 시, 학과별 시간표 API를 백그라운드에서 교차 조회해 해당 과목이 '이러닝', '플립러닝', '상대평가' 등의 특수 수업 속성을 가지는지 화면에 함께 표시합니다.

### course-registration-manager (본신청)

```bash
npm run sugang:registration
# 또는
npm run course-reg:manager
```

**수강신청 본신청 전용**입니다. 희망바구니(예비 담기)는 포함하지 않습니다.  
서버: `https://sugangh.seowon.ac.kr` · menuId=`M100780` · 쿠키: `.seowon-sugang.cookies.json`

```text
1. 로그인 / 세션 갱신
2. 개설 강의 검색
3. 수강신청 (검색 → 선택 → 등록)
4. 수강신청 취소
5. 내 수강신청 목록 조회
6. 연속 재시도 모드 (정원 초과 과목 반복 신청)
0. 종료
```

- 메뉴 6: 정원 초과 시 지정 간격(기본 500ms)으로 반복 신청, 성공 시 중단, `Ctrl+C`로 종료
- 로그인 `flag=0`(과부하 허위 실패) 및 네트워크 오류 자동 재시도
- `.env`의 `SEOWON_ID` / `SEOWON_PASSWORD`로 자동 로그인

## 라이브러리 API

### e-campus 클라이언트

```typescript
import { createEcampusClient } from "seowon-client-api";

const client = createEcampusClient({
  cookieFilePath: "./.seowon-ecampus.cookies.json"
});

await client.login({
  userId: "your_id",
  password: "your_password"
});

const courses = await client.getCourseList();
const groups = await client.getCourseGroups();
```

#### 강의실 리소스

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

#### 이러닝

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

#### 성적

```typescript
const scoreAccess = await client.getScoreAccessInfo({
  crsCreCd: "COURSE_CODE"
});

if (scoreAccess.canViewScore) {
  const scoreSummary = await client.getScoreSummary({
    crsCreCd: "COURSE_CODE"
  });
  console.log(scoreSummary.items, scoreSummary.total, scoreSummary.grade);
} else {
  console.log(scoreAccess.message);
}
```

성적 조회는 `scoreOpenJson`으로 공개 여부·설문 게이트를 확인한 뒤, 성적 페이지의 hidden `stdNo`로 요약 fragment를 가져옵니다.

### 희망바구니 클라이언트

```typescript
import { createHopeBasketClient } from "seowon-client-api";

const basket = createHopeBasketClient({
  cookieFilePath: "./.seowon-hope-basket.cookies.json"
});

await basket.login({
  stuno: "your_student_no",
  password: "your_password"
});

const subjects = await basket.searchSubjects({
  keyword: "컴퓨터구조",
  asignDeprtCd: basket.getStudentInfo()?.deptCd
});

await basket.addToBasket({
  subjtCd: subjects[0].subjtCd,
  corseDvclsNo: subjects[0].corseDvclsNo
});

const myList = await basket.getMyHopeBasketList();
const myTimetable = await basket.getMyHopeBasketTimetable();
console.log(await basket.formatMyHopeBasketTimetable());

// 학생의 학과·학년 기준 전공 과목 일괄 담기 (또는 조회)
const preview = await basket.addMajorCoursesForStudent({
  dryRun: true, // true면 실제로 담지 않고 후보 목록만 반환
  includeUnknownYear: true // 학년 미지정 과목 포함 여부
});
console.log(
  `전체 ${preview.allSubjects.length}개 전공 분반 중 ${preview.candidates.length}개 과목 매칭`
);

await basket.cancelFromBasket({
  subjtCd: myList[0].subjtCd,
  corseDvclsNo: myList[0].corseDvclsNo
});
```

### 수강신청 본신청 클라이언트

```typescript
import { createCourseRegistrationClient } from "seowon-client-api";

// 본신청 전용 — 희망바구니 쿠키/클라이언트와 분리
const courseReg = createCourseRegistrationClient({
  cookieFilePath: "./.seowon-sugang.cookies.json"
});

await courseReg.login({
  stuno: "your_student_no",
  password: "your_password"
});

// 개설 검색 (menuId=M100780)
const subjects = await courseReg.searchSubjects({
  keyword: "운영체제",
  asignDeprtCd: courseReg.getStudentInfo()?.deptCd
});

// 실제 수강신청 등록 (saveAppcsDtls.do)
const result = await courseReg.registerCourse({
  subjtCd: subjects[0].subjtCd,
  corseDvclsNo: subjects[0].corseDvclsNo,
  cmpsjDivCd: subjects[0].cmpsjDivCd,
  skipAuxRequests: true // 자동화 시 GLIO/sysdate 생략 가능
});
console.log(result.success, result.message, result.errorType);

// 내 수강신청 목록 (findAppcsDtlsList.do — 희망바구니 ShpbsList 아님)
const registered = await courseReg.getMyRegisteredList();

// 취소
await courseReg.cancelCourse({
  subjtCd: registered[0].subjtCd,
  corseDvclsNo: registered[0].corseDvclsNo,
  cmpsjDivCd: registered[0].cmpsjDivCd
});

// 정원 초과 과목 연속 재시도
const retry = await courseReg.registerCourseWithRetry({
  subjtCd: "736012",
  corseDvclsNo: "01",
  intervalMs: 500,
  maxAttempts: 0, // 0 = 무한 (shouldStop / 성공 시 중단)
  skipAuxRequests: true
});
```

#### 두 시스템 동시 사용 (올바른 패턴)

```typescript
import {
  createHopeBasketClient,
  createCourseRegistrationClient
} from "seowon-client-api";

const hopeBasket = createHopeBasketClient({
  cookieFilePath: ".seowon-hope-basket.cookies.json"
});
const courseReg = createCourseRegistrationClient({
  cookieFilePath: ".seowon-sugang.cookies.json"
});

await hopeBasket.login({ stuno: "...", password: "..." });
await courseReg.login({ stuno: "...", password: "..." });

// 예비 담기 → saveHopeAppcsDtls (M100779)
await hopeBasket.addToBasket({ subjtCd: "736082", corseDvclsNo: "01" });

// 실제 등록 → saveAppcsDtls (M100780)
await courseReg.registerCourse({ subjtCd: "736082", corseDvclsNo: "01" });
```

#### 학년 매칭 필터 (`SCUR0150` 공통코드)

학생의 학년(`student.hy`, 예: `"2"`)과 과목의 이수학년구분코드(`cmpsjHyDivCd`, 예: `"07"`) 간의 실제 서원대 수강신청 공통코드 매핑 규칙을 적용하여 필터링합니다:

- **1학년**: `01` (1-4), `02` (1-3), `03` (1-2), `04` (1), `11` (1-5)
- **2학년**: `05` (2-4), `06` (2-3), `07` (2), `12` (2-5)
- **3학년**: `08` (3-4), `09` (3), `13` (3-5)
- **4학년**: `10` (4), `14` (4-5)
- **5학년**: `15` (5)
- **전체/미지정**: `00`, `99`, 빈 값 등 (`includeUnknownYear` 옵션에 따라 매칭 여부 결정)

### SAZ 패킷 분석

```typescript
import {
  parseEcampusScoreSummariesFromSaz,
  parseFiddlerSazSessions,
  parseSugangBasketFromSaz
} from "seowon-client-api";

const sessions = parseFiddlerSazSessions(sazBuffer);
const scoreSummaries = parseEcampusScoreSummariesFromSaz(sazBuffer);
const basketSummary = parseSugangBasketFromSaz(sazBuffer);
```

SAZ·캡처 원본은 민감 데이터로 취급하며 Git에 넣지 않습니다.  
로컬 보관 권장 경로: `research/saz/` (레거시 `SAZ/`, `files/` 도 테스트가 폴백 탐색).  
e-campus 파서: `src/ecampus/saz.ts` · 희망바구니 파서: `src/hope-basket/saz.ts`

## 주요 공개 메서드

### EcampusClient

| 메서드                              | 설명                      |
| :---------------------------------- | :------------------------ |
| `login()`                           | 계정 로그인 및 쿠키 저장  |
| `ensureAuthenticated()`             | 유효 쿠키 없으면 재로그인 |
| `getCourseList()`                   | 전체 과목 목록            |
| `getCourseGroups()`                 | 교과/비교과 그룹          |
| `getNoticeList()`                   | 공지사항                  |
| `getMaterialList()`                 | 강의자료                  |
| `getMaterialAttachments()`          | 강의자료 첨부 URL         |
| `getAssignmentList()`               | 과제·제출 상태            |
| `getClassroomResources()`           | 공지/자료/과제 통합       |
| `getScoreOpenInfo()`                | 성적 공개 여부            |
| `getScoreAccessInfo()`              | 공개 조건·설문 게이트     |
| `getScore()` / `getScorePageHtml()` | 성적 페이지               |
| `getScoreSummary()`                 | 항목별 점수/총점/등급     |
| `getElearningLessonList()`          | 이러닝 차시               |
| `openLessonWindow()`                | 시청 창 메타데이터        |
| `getElearningMp4Url()`              | MP4 주소                  |
| `downloadElearningMp4()`            | 영상 다운로드             |
| `addStudyRecord()`                  | 학습 기록 전송            |
| `viewLessonStudyDetail()`           | 학습 이력 상세            |

### HopeBasketClient

희망바구니(예비 담기) 전용입니다. 본신청 등록/취소 API는 없습니다 → `CourseRegistrationClient` 사용.

| 메서드                               | 설명                               |
| :----------------------------------- | :--------------------------------- |
| `login()`                            | 희망바구니 로그인·학생 정보        |
| `syncTermContext()`                  | 학년도/학기 동기화                 |
| `getAppcsSchedules()`                | 관련 일정                          |
| `getDepartments()`                   | 개설 학과                          |
| `getCultureDomains()`                | 교양 영역                          |
| `searchSubjects()`                   | 개설 교과목 검색 (GnrlList)        |
| `getMyHopeBasketList()`              | 내가 담은 목록 (ShpbsList)         |
| `getMyHopeBasketTimetable()`         | 내 바구니 간이 시간표 집계         |
| `formatMyHopeBasketTimetable()`      | 간이 시간표 ASCII 그리드           |
| `exportMyHopeBasketTimetableImage()` | 시간표 HTML/PNG 파일 저장          |
| `renderMyHopeBasketTimetableSvg()`   | 시간표 내부 SVG 마크업 문자열      |
| `checkBasketItem()`                  | 담기 전 검증                       |
| `addToBasket()`                      | 바구니 담기                        |
| `cancelFromBasket()`                 | 바구니 취소                        |
| `addMajorCoursesForStudent()`        | 본인 학과·학년 전공 일괄 담기/조회 |
| `getTimetableDepartments()`          | 학과별 개설 시간표 학과            |
| `getTimetableSubjects()`             | 학과별 개설 시간표 분반            |

### CourseRegistrationClient

수강신청 **본신청** 전용입니다. 희망바구니 API는 없습니다 → `HopeBasketClient` 사용.

| 메서드                     | 설명 |
| :------------------------- | :--- |
| `login()`                  | 본신청 로그인 (appcsKindCd 없음, flag=0 재시도) |
| `ensureLoggedIn()`         | 세션 만료 시 자동 재로그인 |
| `syncTermContext()`        | 학년도/학기 동기화 |
| `searchSubjects()`         | 개설 교과목 검색 (GnrlList, M100780) |
| `getMyRegisteredList()`    | 내 수강신청 목록 (`findAppcsDtlsList`) |
| `registerCourse()`         | 수강신청 등록 (`saveAppcsDtls`, 경고체크 포함) |
| `cancelCourse()`           | 수강신청 취소 (`saveAppcsDtlsCancl`) |
| `registerCourseWithRetry()`| 정원 초과 등 연속 재시도 등록 |

관련 에러 유틸: `CourseRegErrorType`, `classifyCourseRegError`, `formatCourseRegError`

## 프로젝트 구조

```text
src/
  index.ts                     패키지 공개 API
  utils.ts                     공통 유틸 (normalizeBaseUrl, escapeRegExp, 공통 헤더)
  cli-ui.ts                    CLI 색상·입력·도움말
  types/                       CLI/auto-manager 공용 타입
  ecampus/                     e-campus 연동
    login.ts                   EcampusClient
    cookies.ts                 CookieJar 저장/복원 (비동기 write)
    crypto.ts                  로그인 encryptData
    courses.ts                 과목 목록 파싱
    classroom.ts               공지/자료/과제 HTML 파싱
    elearning.ts               이러닝 파싱·다운로드·학습 세션
    score.ts                   성적 공개/설문/요약
    saz.ts                     SAZ 공통 세션 복원 + e-campus 파서
    types/                     기능별 타입
    legacy/login-crypto.cjs    로그인 암호화 모듈
  hope-basket/                 희망바구니 전용 (본신청 아님)
    constants.ts               호스트·메뉴·경로 (appcsKindCd=100)
    ssv.ts                     Nexacro SSV 코덱 (본신청도 재사용)
    basket.ts                  요청 생성·응답 파싱
    timetable.ts               timtbNm 파싱·간이 시간표
    saz.ts                     희망바구니 SAZ 복원
    client.ts                  HopeBasketClient
    types/                     희망바구니/SSV 타입
  course-registration/         수강신청 본신청 전용 (M100780)
    constants.ts               menuId/pgmId·saveAppcsDtls 등 경로
    errors.ts                  CourseRegErrorType·분류/포맷
    registration.ts            create*/parse* 순수 함수
    client.ts                  CourseRegistrationClient
    types/registration.ts      CourseReg* 타입
cli/
  prompt-client.js             개별 API 진단 CLI
  auto-manager.ts              e-campus 반복 작업 CLI
  hope-basket-manager.ts       희망바구니 CLI
  course-registration-manager.ts 수강신청 본신청 CLI
scripts/
  build-legacy-crypto.cjs
  copy-legacy.cjs
  analyze-saz.mjs
  capture-live.mjs
db-generator/
  generate.ts                  전체 개설 과목 수집 → JSON DB
  viewer.ts                    생성된 DB 검색/필터 뷰어
  output/                      생성된 JSON DB 저장 디렉터리
docs/
  architecture.md              구조 메모
  api-responses/               샘플 응답
  notes/                       개선·최적화 메모
  prompts/                     구현 프롬프트
  feedback/                    추후 피드백 분석
research/
  saz/                         Fiddler SAZ·패킷 원본 (로컬 참고)
data/                          대형 과목 DB 스냅샷 (gitignore)
captures/                      live traffic 캡처 (gitignore)
output/                        시간표 HTML/PNG 등 생성물 (gitignore)
```

## 개발 명령

| 명령                            | 설명                                      |
| :------------------------------ | :---------------------------------------- |
| `npm run prompt:client`         | e-campus·희망바구니 API 진단 CLI          |
| `npm run auto:manager`          | e-campus 반복 작업 CLI                    |
| `npm run hope-basket:manager`   | 희망바구니 CLI                            |
| `npm run sugang:registration`   | **수강신청 본신청** CLI                   |
| `npm run course-reg:manager`    | `sugang:registration` 별칭                |
| `npm run generate:db`           | 전체 개설 과목 수집 → JSON DB             |
| `npm run view:db`               | 생성된 과목 DB 검색/필터 뷰어             |
| `npm run analyze:saz`           | SAZ 패킷 분석                             |
| `npm run capture:live`          | Chrome live traffic capture               |
| `npm run typecheck`             | TypeScript 검사                           |
| `npm run format:check`          | Prettier 검사                             |
| `npm run lint`                  | ESLint 검사                               |
| `npm test`                      | Vitest 실행 (단위, 본신청 단위 테스트 포함) |
| `npm run test:course-reg:smoke` | 본신청 **라이브** 스모크 (로그인·검색·목록) |
| `npm run build`                 | legacy 암호화 준비 후 패키지 빌드         |

## 코드 주석 규칙

- 모든 함수에 한국어 JSDoc (`@param`, `@returns`, 필요 시 `@throws`)
- 자명한 WHAT보다 **WHY**(의도·제약·비정상 로직) 위주
- 서버 API 제약, HTML 구조 의존, 터미널 렌더링 보정 등만 짧게 남김

## 빌드와 로컬 원본 파일

`npm run build`, `npm test`, `npm run prepack`, `npm run test:login`은 먼저 `scripts/build-legacy-crypto.cjs`를 실행합니다.

로컬 NICE 원본(Git 미포함)이 있으면:

```text
files/ecam/ecamjs/nice.nuguya.oivs.crypto.js
files/ecam/ecamjs/nice.nuguya.oivs.util.js
files/ecam/ecamjs/nice.nuguya.oivs.msg.js
```

원본이 있으면 `src/ecampus/legacy/login-crypto.cjs`를 재생성하고, 없으면 기존 생성물을 재사용합니다.

## 로컬 파일과 보안

공개 저장소에 올리지 않는 항목:

```text
.env
.seowon-ecampus.cookies.json
.seowon-hope-basket.cookies.json
.seowon-sugang.cookies.json
.seowon-sugang.cookies.smoke.json
.seowon-ecampus.session.json
files/
research/saz/
downloads/
data/
data/all-courses.json
data/all-courses-enriched.json
*.saz
*.mp4
tmp-*.html
captures/
output/
.puppeteer-user-data/
```

푸시 전 계정·쿠키·세션·캡처·다운로드·대형 과목 DB·SAZ 포함 여부를 확인하세요.  
`.gitignore`에 `*.cookies.json`, `data/`, `research/saz/`, `captures/`, `output/` 등이 포함되어 있습니다.

## 디렉터리 안내 (한눈에)

| 경로 | 역할 |
| :--- | :--- |
| `src/` | 패키지 라이브러리 소스 (공개 API는 `src/index.ts`) |
| `cli/` | 인터랙티브 CLI 진입점 |
| `test/` | Vitest 단위·스모크 테스트 |
| `scripts/` | 빌드·SAZ 분석·live capture 보조 스크립트 |
| `docs/` | 아키텍처·샘플 응답·프롬프트·피드백 메모 |
| `research/` | 로컬 역공학 자료 (`saz/` 등, 민감·gitignore) |
| `db-generator/` | 전체 개설 과목 DB 수집/뷰어 |
| `data/` | 대형 과목 DB 스냅샷 (gitignore) |
| `examples/` | 사용 예시 |
| `dist/` | 빌드 산출물 |

## 검증 메모

로컬에서 확인할 때:

```bash
npm run typecheck
npx vitest run test/hope-basket.test.ts
npx vitest run test/course-registration.test.ts
# 실제 서버 스모크 (.env 계정 필요, 등록/취소는 수행하지 않음)
npm run test:course-reg:smoke
```

`npm test` 전체는 fixture(로그인 HTML, 강의실/이러닝 캡처 등)가 없는 환경에서 일부 실패할 수 있습니다.  
`npm run lint`는 생성 디렉터리·진단 스크립트까지 포함되면 실패할 수 있어, 소스 범위 제한 보완이 필요할 수 있습니다.
