# seowon-client-api

서원대학교 e-campus 연동을 위한 TypeScript 클라이언트 API 패키지입니다.

이 프로젝트는 브라우저에서 동작하는 e-campus 프론트 흐름과 저장된 패킷 자료를 분석해, 로그인, 과목 목록 조회, 강의실별 공지사항/과제/강의자료실 목록 조회를 코드로 재사용할 수 있게 정리한 모듈입니다.

> 현재 패키지는 개인 작업용 비공개 패키지입니다. 실제 계정 정보와 로그인 쿠키를 다루므로 저장소 공유, 로그 출력, 배포 범위를 주의해야 합니다.

## 주요 기능

- e-campus 로그인용 `encryptData` 생성
- 실제 로그인 요청 및 쿠키 세션 유지
- 로그인 후 메인 페이지에서 과목 목록 JSON 추출
- 과목별 강의실 고유 코드(`crsCreCd`)와 과목 타입(`crsTypeCd`) 추출
- 강의실별 공지사항 목록 JSON 조회
- 강의실별 과제 목록 JSON 조회
- 강의실별 강의자료실 목록 JSON 조회
- Fiddler `.saz` 패킷 파일에서 목록 데이터를 분석용 JSON으로 추출

## 설치

```bash
npm install
```

## 환경 변수

프로젝트 루트에 `.env` 파일을 두고 로그인 정보를 설정합니다.

```env
# 서원대학교 e-campus 로그인에 사용하는 학번 또는 아이디입니다.
SEOWON_ID=202612345

# 서원대학교 e-campus 로그인에 사용하는 비밀번호입니다.
SEOWON_PASSWORD=your-password
```

| 변수 | 의미 | 예시 |
| --- | --- | --- |
| `SEOWON_ID` | e-campus 로그인 학번/아이디 | `202612345` |
| `SEOWON_PASSWORD` | e-campus 로그인 비밀번호 | `********` |

주의:

- `.env`에는 실제 계정 정보가 들어가므로 커밋하지 않습니다.
- 로그인 통합 테스트는 실제 e-campus 서버에 요청을 보냅니다.
- 테스트 로그에 비밀번호가 노출되지 않도록 유지해야 합니다.

## 핵심 개념

### `crsCreCd`

강의실 또는 개설 과목을 식별하는 고유 코드입니다.

예시:

```json
{
  "title": "논리회로",
  "crsCreCd": "2026_1_736078_01",
  "crsTypeCd": "UNI"
}
```

`2026_1_736078_01`이 논리회로 강의실의 고유 코드입니다.

### `crsTypeCd`

과목 타입을 나타냅니다.

| 값 | 의미 | 강의실 진입 경로 |
| --- | --- | --- |
| `UNI` | 교과 | `/crs/creCrsLect/Form/classRoomMainForm` |
| `CO` | 비교과 | `/crs/creCrsOpen/Form/classRoomMainForm` |

교과/비교과 구분은 `crsTypeCd`로 판단하는 것이 가장 안정적입니다.

### 게시판 ID 규칙

교과 강의실의 게시판 ID는 현재 분석한 패킷 기준으로 다음 규칙을 따릅니다.

| 영역 | ID 형식 | 논리회로 예시 |
| --- | --- | --- |
| 공지사항 | `BBS_${crsCreCd}_N` | `BBS_2026_1_736078_01_N` |
| 강의자료실 | `BBS_${crsCreCd}_P` | `BBS_2026_1_736078_01_P` |

## 기본 사용법

### 클라이언트 생성

```ts
import { createEcampusClient } from "seowon-client-api";

const ecampus = createEcampusClient();
```

### 로그인

```ts
import "dotenv/config";
import { createEcampusClient } from "seowon-client-api";

const ecampus = createEcampusClient();

const result = await ecampus.login({
  userId: process.env.SEOWON_ID!,
  password: process.env.SEOWON_PASSWORD!
});

console.log(result.type);
```

로그인 결과 타입:

| 타입 | 의미 |
| --- | --- |
| `redirect` | OTP/사용자 정보가 포함된 리다이렉트 형태 |
| `reload` | 로그인 후 페이지 리로드가 필요한 형태 |
| `error` | 로그인 실패 또는 응답에 `redirectUrl`이 없는 형태 |

### 로그인 암호화 값만 만들기

```ts
import { createLoginEncryptData } from "seowon-client-api";

const encryptData = createLoginEncryptData("202612345", "password");
console.log(encryptData);
```

## 과목 목록 조회

로그인 후 메인 페이지 HTML에서 과목 목록을 추출합니다.

```ts
const courseList = await ecampus.getCourseList();
console.log(courseList);
```

반환 형태:

```json
[
  {
    "title": "논리회로",
    "crsCreCd": "2026_1_736078_01",
    "crsTypeCd": "UNI"
  },
  {
    "title": "2026년 교제폭력 예방교육",
    "crsCreCd": "CE_260304T150804_e192529",
    "crsTypeCd": "CO"
  }
]
```

JSON 문자열로 받고 싶으면 다음 메서드를 사용합니다.

```ts
const json = await ecampus.getCourseListJson();
console.log(json);
```

기존 호환용 메서드도 같은 배열 JSON을 반환합니다.

```ts
const json = await ecampus.getCourseNamesJson();
```

HTML 문자열이 이미 있다면 파서만 따로 사용할 수 있습니다.

```ts
import { parseEcampusCourseListJson } from "seowon-client-api";

const json = parseEcampusCourseListJson(html);
console.log(json);
```

## 강의실 목록 조회

목록 조회에는 과목의 `crsCreCd`가 필요합니다.

논리회로 예시:

```ts
const crsCreCd = "2026_1_736078_01";
```

### 공지사항 목록

```ts
const notices = await ecampus.getNoticeList({
  crsCreCd: "2026_1_736078_01"
});

console.log(notices);
```

JSON 문자열:

```ts
const json = await ecampus.getNoticeListJson({
  crsCreCd: "2026_1_736078_01"
});

console.log(json);
```

### 강의자료실 목록

```ts
const materials = await ecampus.getMaterialList({
  crsCreCd: "2026_1_736078_01"
});

console.log(materials);
```

JSON 문자열:

```ts
const json = await ecampus.getMaterialListJson({
  crsCreCd: "2026_1_736078_01"
});

console.log(json);
```

### 과제 목록

과제 목록은 e-campus 요청에서 `userNo`, `userName` 값도 함께 사용됩니다.

```ts
const assignments = await ecampus.getAssignmentList({
  crsCreCd: "2026_1_736078_01",
  userNo: process.env.SEOWON_ID!,
  userName: "홍길동"
});

console.log(assignments);
```

JSON 문자열:

```ts
const json = await ecampus.getAssignmentListJson({
  crsCreCd: "2026_1_736078_01",
  userNo: process.env.SEOWON_ID!,
  userName: "홍길동"
});

console.log(json);
```

### 통합 목록

공지사항, 강의자료실, 과제를 한 번에 가져올 수도 있습니다.

```ts
const resources = await ecampus.getClassroomResources({
  crsCreCd: "2026_1_736078_01",
  userNo: process.env.SEOWON_ID!,
  userName: "홍길동"
});

console.log(resources.notices);
console.log(resources.materials);
console.log(resources.assignments);
```

## 목록 아이템 구조

공지사항, 강의자료실, 과제 목록은 공통적으로 `EcampusClassroomItem` 형태를 사용합니다.

```ts
interface EcampusClassroomItem {
  id: string;
  title: string;
  url: string;
  request: {
    method: "POST";
    url: string;
    body: Record<string, string>;
  };
  date?: string;
  period?: string;
  status?: string;
  hasAttachment?: boolean;
}
```

필드 설명:

| 필드 | 의미 |
| --- | --- |
| `id` | 항목 고유 ID. 게시글은 `atclId`, 과제는 `asmntCd` |
| `title` | 화면에 표시되는 제목 |
| `url` | 상세 페이지 요청 URL |
| `request.method` | 상세 페이지 접근 방식. 현재 분석 기준 대부분 `POST` |
| `request.url` | 상세 페이지 POST 대상 URL |
| `request.body` | 상세 페이지 진입에 필요한 form body |
| `date` | 공지사항/강의자료실 작성일 |
| `period` | 과제 제출 기간 |
| `status` | 과제 제출 상태 |
| `hasAttachment` | 첨부파일 아이콘 감지 여부 |

중요:

- e-campus 상세 페이지는 단순 GET 링크가 아니라 JavaScript가 POST form을 만들어 렌더링하는 경우가 많습니다.
- 그래서 이 패키지는 단순 URL뿐 아니라 `request.body`까지 함께 반환합니다.

## 패킷 파일 분석용 API

`files` 폴더에 저장된 Fiddler `.saz` 파일을 분석해 목록 JSON을 만들 수 있습니다.

```ts
import { readFileSync } from "node:fs";
import {
  parseEcampusAssignmentListFromSaz,
  parseEcampusMaterialListFromSaz,
  parseEcampusNoticeListFromSaz,
  stringifyEcampusClassroomItems
} from "seowon-client-api";

const saz = readFileSync(
  "files/논리회로 강의실 입장, 과제 목록, 강의자료실 입장 packet/강의실.saz"
);

console.log(stringifyEcampusClassroomItems(parseEcampusAssignmentListFromSaz(saz)));
console.log(stringifyEcampusClassroomItems(parseEcampusMaterialListFromSaz(saz)));
console.log(stringifyEcampusClassroomItems(parseEcampusNoticeListFromSaz(saz)));
```

통합 분석:

```ts
import {
  parseEcampusClassroomResourcesFromSaz,
  stringifyEcampusClassroomResources
} from "seowon-client-api";

const resources = parseEcampusClassroomResourcesFromSaz(saz);
console.log(stringifyEcampusClassroomResources(resources));
```

## 테스트

전체 테스트:

```bash
npm test
```

타입 검사:

```bash
npm run typecheck
```

빌드:

```bash
npm run build
```

### 단독 테스트 명령어

과목 리스트 JSON:

```bash
npx vitest run test/ecampus-courses.test.ts --reporter verbose
```

과제 JSON:

```bash
npx vitest run test/ecampus-assignments.test.ts --reporter verbose
```

강의자료실 JSON:

```bash
npx vitest run test/ecampus-materials.test.ts --reporter verbose
```

공지사항 JSON:

```bash
npx vitest run test/ecampus-notices.test.ts --reporter verbose
```

실제 로그인 테스트:

```bash
npm run test:login
```

주의:

- `npm run test:login`은 실제 e-campus 서버로 로그인 요청을 보냅니다.
- `.env` 설정이 필요합니다.
- 로그인 성공 시 쿠키 값이 테스트 로그에 출력됩니다.

## 프로젝트 구조

```txt
src/
  index.ts
  ecampus/
    login.ts       로그인 클라이언트와 로그인 후 조회 API
    crypto.ts      로그인 encryptData 생성 API
    courses.ts     과목 목록 파서
    classroom.ts   공지사항, 과제, 강의자료실 목록 파서
    legacy/        레거시 로그인 암호화 번들

scripts/
  build-legacy-crypto.cjs  원본 암호화 JS에서 필요한 코드 번들 생성
  copy-legacy.cjs          빌드 결과물에 레거시 암호화 파일 복사

test/
  ecampus-login.test.ts              로그인 응답/암호화 단위 테스트
  ecampus-login.integration.test.ts  실제 로그인 통합 테스트
  ecampus-courses.test.ts            과목 목록 JSON 테스트
  ecampus-assignments.test.ts        과제 목록 JSON 테스트
  ecampus-materials.test.ts          강의자료실 목록 JSON 테스트
  ecampus-notices.test.ts            공지사항 목록 JSON 테스트

files/
  ecam/                              로그인 암호화 원본 JS 참고 파일
  로그인 후 메인 홈페이지/            과목 목록 분석용 저장 HTML
  논리회로 ... packet/               논리회로 강의실 SAZ 패킷 자료
```

## 참고 파일과 보안

`files` 폴더는 패키지 코드가 아니라 분석을 위한 참고 자료입니다.

포함된 자료:

- 로그인 후 저장한 메인 HTML
- e-campus 프론트 JS/CSS
- 논리회로 강의실 진입 및 목록 요청 패킷
- 로그인 암호화 관련 원본 JS

주의:

- 저장된 HTML/패킷에는 개인 계정, 학번, 사용자 이름, 쿠키 또는 세션 흐름과 관련된 정보가 포함될 수 있습니다.
- 외부 공유 전 민감 정보를 제거해야 합니다.
- 패키지 배포 대상에는 `files` 폴더를 포함하지 않는 것이 좋습니다.

## 현재 확인된 상태

마지막 확인 기준:

```bash
npm run typecheck
npm test
```

결과:

- 타입 검사 통과
- 전체 테스트 통과
- 6개 테스트 파일, 12개 테스트 통과

## 향후 작업 후보

- 과목명으로 강의실을 선택해 공지/과제/자료실을 바로 조회하는 편의 API 추가
- 비교과(`CO`) 강의실의 공지/자료/과제 구조 추가 분석
- 상세 게시글/과제 본문 조회 기능 추가
- 강의자료실 첨부파일 목록 및 안전 다운로드 기능 구현
- README 예제를 실제 npm 패키지 배포 형태에 맞춰 정리
- package.json 설명 문구의 한글 인코딩 정리
