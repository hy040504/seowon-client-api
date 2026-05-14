# seowon-client-api

서원대학교 e-campus를 위한 TypeScript 클라이언트 라이브러리입니다.

이 패키지는 다음 작업을 모듈로 제공합니다.

- 로그인용 `encryptData` 생성
- e-campus 로그인 요청
- 로그인 후 메인 페이지에서 과목 목록 추출
- 강의실의 공지사항, 과제, 강의자료실 목록 추출
- Fiddler SAZ 패킷에서 목록 복원
- 쿠키 파일 저장 및 만료 시 자동 재로그인

## 설치

```bash
npm install
```

## 환경 변수

루트 `.env` 파일에 아래 값을 넣습니다.

```env
# e-campus 로그인에 사용할 학번 또는 아이디
SEOWON_ID=202612345

# e-campus 로그인 비밀번호
SEOWON_PASSWORD=비밀번호를입력하세요
```

### 값 의미

- `SEOWON_ID`
  - e-campus 로그인에 사용하는 학번 또는 아이디입니다.
- `SEOWON_PASSWORD`
  - e-campus 로그인 비밀번호입니다.

## 기본 사용법

```ts
import "dotenv/config";
import {
  createEcampusClient,
  createLoginEncryptData
} from "seowon-client-api";

const client = createEcampusClient();
const encryptData = createLoginEncryptData(
  process.env.SEOWON_ID!,
  process.env.SEOWON_PASSWORD!
);

const result = await client.loginWithEncryptData({ encryptData });
console.log(result.type);
```

## 로그인

### 1. encryptData 생성

```ts
const encryptData = createLoginEncryptData(
  process.env.SEOWON_ID!,
  process.env.SEOWON_PASSWORD!
);
```

### 2. 로그인 요청

```ts
const client = createEcampusClient();
const result = await client.loginWithEncryptData({ encryptData });
```

### 3. 응답 형태

`parseLoginResponse()` 기준으로 다음 셋 중 하나로 정리됩니다.

- `redirect`
- `reload`
- `error`

## 과목 목록

로그인 후 메인 페이지에서 과목 목록을 뽑을 수 있습니다.

```ts
const client = createEcampusClient();
const courses = await client.getCourseList();
console.log(courses);
```

반환 형태:

```json
[
  { "title": "논리회로", "crsCreCd": "2026_1_736078_01", "crsTypeCd": "UNI" },
  { "title": "2026년 교제폭력 예방교육", "crsCreCd": "CE_260304T150804_e192529", "crsTypeCd": "CO" }
]
```

### 과목 구분

- `crsTypeCd === "UNI"`: 교과
- `crsTypeCd === "CO"`: 비교과

### 관련 함수

- `parseEcampusCourseList(html)`
- `parseEcampusCourseListJson(html)`
- `parseEcampusCourseGroups(html)`
- `parseEcampusCourseNames(html)`
- `parseEcampusCourseNamesJson(html)`

## 강의실 목록

강의실의 공지사항, 과제, 강의자료실을 각각 분리해서 가져올 수 있습니다.

```ts
const client = createEcampusClient();
const notices = await client.getNoticeList({
  crsCreCd: "2026_1_736078_01"
});
const assignments = await client.getAssignmentList({
  crsCreCd: "2026_1_736078_01",
  userNo: "학번",
  userName: "이름"
});
const materials = await client.getMaterialList({
  crsCreCd: "2026_1_736078_01"
});
```

### JSON 바로 받기

```ts
const noticeJson = await client.getNoticeListJson({ crsCreCd: "2026_1_736078_01" });
const assignmentJson = await client.getAssignmentListJson({
  crsCreCd: "2026_1_736078_01",
  userNo: "학번",
  userName: "이름"
});
const materialJson = await client.getMaterialListJson({ crsCreCd: "2026_1_736078_01" });
```

### 항목 구조

각 항목은 대체로 아래 정보를 포함합니다.

- `id`
- `title`
- `url`
- `request`
- `date`
- `period`
- `status`
- `hasAttachment`

`url`은 상세 진입용 주소이고, `request`에는 실제 전송해야 하는 `method`와 `body`가 함께 들어갑니다.

## 쿠키 저장과 자동 재로그인

쿠키를 파일에 저장하고, 만료되면 다시 로그인하도록 만들 수 있습니다.

```ts
const client = createEcampusClient({
  cookieFilePath: "./data/ecampus-cookie.json",
  loginCredentials: {
    userId: process.env.SEOWON_ID!,
    password: process.env.SEOWON_PASSWORD!
  }
});
```

이렇게 만들면 다음 흐름으로 동작합니다.

1. 쿠키 파일이 있으면 먼저 읽음
2. 쿠키가 유효하면 그대로 사용
3. 만료되었으면 `loginCredentials`로 재로그인
4. 새 쿠키를 다시 파일에 저장

### 쿠키 관련 유틸

- `loadCookieJarFromFile(filePath)`
- `saveCookieJarToFile(filePath, cookieJar)`
- `isCookieJarUsable(cookieJar)`
- `isSerializedCookieJarUsable(serialized)`

## SAZ 패킷 분석

Fiddler SAZ 파일에서 강의실 목록을 복원할 수 있습니다.

```ts
import { readFileSync } from "node:fs";
import {
  parseEcampusAssignmentListFromSaz,
  stringifyEcampusClassroomItems
} from "seowon-client-api";

const saz = readFileSync("./files/논리회로 강의실 입장, 과제 목록, 강의자료실 packet/강의실.saz");
const assignments = parseEcampusAssignmentListFromSaz(saz);
console.log(stringifyEcampusClassroomItems(assignments));
```

지원 함수:

- `parseEcampusNoticeListFromSaz()`
- `parseEcampusAssignmentListFromSaz()`
- `parseEcampusMaterialListFromSaz()`
- `parseEcampusClassroomResourcesFromSaz()`

## 테스트

### 전체 테스트

```bash
npm test
```

### 타입 검사

```bash
npm run typecheck
```

### 단독 테스트

```bash
npx vitest run test/ecampus-courses.test.ts --reporter verbose
npx vitest run test/ecampus-assignments.test.ts --reporter verbose
npx vitest run test/ecampus-materials.test.ts --reporter verbose
npx vitest run test/ecampus-notices.test.ts --reporter verbose
npx vitest run test/ecampus-cookie-persistence.test.ts --reporter verbose
```

### 실제 로그인 테스트

```bash
npm run test:login
```

이 테스트는 실제 계정으로 로그인 요청을 보냅니다.

로그에는 다음이 출력됩니다.

- `encryptData`
- 로그인 응답 타입
- 로그인 응답 데이터
- 성공 시 쿠키 문자열

## 공개 API

### 로그인

- `createEcampusClient()`
- `parseLoginResponse()`
- `createLoginEncryptData()`

### 과목

- `parseEcampusCourseList()`
- `parseEcampusCourseListJson()`
- `parseEcampusCourseGroups()`
- `parseEcampusCourseNames()`
- `parseEcampusCourseNamesJson()`

### 강의실

- `parseEcampusNoticeListHtml()`
- `parseEcampusNoticeListFromSaz()`
- `parseEcampusMaterialListHtml()`
- `parseEcampusMaterialListFromSaz()`
- `parseEcampusAssignmentListHtml()`
- `parseEcampusAssignmentListFromSaz()`
- `parseEcampusClassroomResourcesFromSaz()`
- `stringifyEcampusClassroomItems()`
- `stringifyEcampusClassroomResources()`

### 쿠키

- `loadCookieJarFromFile()`
- `saveCookieJarToFile()`
- `isCookieJarUsable()`
- `isSerializedCookieJarUsable()`

## 핵심 값

- `crsCreCd`
  - 과목/강의실 고유 코드
- `crsTypeCd`
  - `UNI`: 교과
  - `CO`: 비교과
- `BBS_${crsCreCd}_N`
  - 공지사항 게시판 ID
- `BBS_${crsCreCd}_P`
  - 강의자료실 게시판 ID

## 프로젝트 구조

```text
src/
  ecampus/
    classroom.ts
    cookies.ts
    courses.ts
    crypto.ts
    login.ts
    legacy/
scripts/
test/
files/
```

## 참고

- 실제 계정 정보는 `.env`에만 둡니다.
- 쿠키 파일은 민감 정보이므로 git에 올리지 않는 편이 좋습니다.
- `node test/*.ts`가 아니라 `vitest`로 테스트를 실행해야 합니다.

