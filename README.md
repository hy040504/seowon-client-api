# seowon-client-api

서원대학교 e-campus(LMS)의 화면 흐름을 코드로 다루기 위한 비공식 TypeScript 클라이언트와 CLI 도구 모음입니다.

로그인과 쿠키 세션 유지, 과목 조회, 공지·강의자료·과제 조회, 이러닝 차시 파싱, MP4 주소 분석, 영상 다운로드, 학습 기록 갱신을 제공합니다.

> 이 프로젝트는 서원대학교의 공식 도구가 아닙니다. 계정 정보와 LMS 데이터는 민감 정보이므로 외부에 노출하지 말고, 학교 정책과 수업 운영 기준을 준수하여 사용하십시오.

## 주요 기능

- `encryptData` 생성과 쿠키 기반 로그인 세션 유지
- 교과·비교과 과목 목록 조회
- 공지사항, 강의자료, 과제 목록 조회 및 통합 조회
- 이러닝 주차·차시, 기간, 강의 시간, 출결 상태 파싱
- 콘텐츠 페이지 분석을 통한 MP4 주소 추출
- 스트림 방식 영상 다운로드와 진행률 표시
- 단일 또는 복수 차시의 순차 학습 기록 갱신
- 현재 기간 내 미완료 이러닝 자동 탐색
- 현재 제출 가능한 미제출 과제 목록과 과제 본문 조회
- 로컬 SAZ 패킷 기반 파서 검증 지원

## 요구 사항

- Node.js `20+`
- npm
- Windows PowerShell 기준으로 개발 및 확인

## 빠른 시작

```bash
npm install
```

`.env.example`을 참고하여 프로젝트 루트에 `.env`를 준비합니다.

```env
SEOWON_ID=your_id
SEOWON_PASSWORD=your_password
DOWNLOAD_HIGH_WATER_MARK=1024
```

| 환경 변수                  | 설명                                       |
| :------------------------- | :----------------------------------------- |
| `SEOWON_ID`                | 로그인 아이디 또는 학번                    |
| `SEOWON_PASSWORD`          | 로그인 비밀번호                            |
| `DOWNLOAD_HIGH_WATER_MARK` | 다운로드 쓰기 버퍼 크기(KB), 기본값 `1024` |

로그인 성공 후 쿠키는 `.seowon-ecampus.cookies.json`에 저장됩니다. 이후 실행에서는 유효한 쿠키가 있으면 기존 세션을 재사용합니다.

## 실행 도구

목적이 다른 두 개의 CLI가 있습니다.

| 도구            | 실행 명령어             | 용도                                               |
| :-------------- | :---------------------- | :------------------------------------------------- |
| `prompt-client` | `npm run prompt:client` | API 응답과 파싱 결과를 기능별로 직접 확인          |
| `auto-manager`  | `npm run auto:manager`  | 다운로드, 순차 시청, 과제 조회 등 반복 작업을 처리 |

### prompt-client

```bash
npm run prompt:client
```

`prompt-client.js`는 개별 API 동작을 확인하기 위한 진단용 CLI입니다.

| 명령어                | 설명                                  |
| :-------------------- | :------------------------------------ |
| `login`               | 로그인 후 쿠키 저장                   |
| `courses`             | 전체 과목 목록 출력                   |
| `notices`             | 선택한 과목의 공지사항 조회           |
| `materials`           | 선택한 과목의 강의자료 조회           |
| `assignments`         | 선택한 과목의 과제와 제출 상태 조회   |
| `classroom-resources` | 공지·강의자료·과제 통합 조회          |
| `elearning-lessons`   | 선택한 과목의 이러닝 차시 목록 조회   |
| `elearning-open`      | 선택한 차시의 시청 창 메타데이터 조회 |
| `elearning-mp4`       | 선택한 차시의 MP4 주소 분석           |
| `elearning-download`  | 선택한 차시의 영상 다운로드           |
| `elearning-watch`     | 선택한 차시의 학습 세션 시작          |
| `help`                | 간단한 도움말 출력                    |

`elearning-watch`는 세션을 시작한 뒤 유지 모드로 진입합니다. 중단하려면 `Ctrl+C`를 사용합니다.

### auto-manager

```bash
npm run auto:manager
```

`auto-manager.ts`는 여러 과목과 차시를 다루는 반복 작업용 CLI입니다.

```text
[메인 메뉴]
1. 로그인 / 로그인 정보 갱신
2. 이러닝 일괄 다운로드 (전체 대기열 시각화)
3. 이러닝 순차 자동 시청 (고급 로그 제어)
4. 전체 교과목 미제출 과제 전수 조사
5. 전 과목 기간 내 미완료 이러닝 자동 시청
6. 현재 수행 가능한 전 과목 미제출 과제 목록
7. 현재 수행 가능한 과제 선택 및 상세내용 보기
0. 종료
```

| 메뉴 | 기능                              | 동작                                                                               |
| :--- | :-------------------------------- | :--------------------------------------------------------------------------------- |
| `1`  | 로그인·세션 갱신                  | 계정 정보를 입력하여 쿠키 세션을 새로 저장                                         |
| `2`  | 이러닝 일괄 다운로드              | 과목과 차시를 선택하고 최대 `5`개의 다운로드 워커로 병렬 처리                      |
| `3`  | 이러닝 순차 자동 시청             | 한 과목의 여러 차시를 선택하고 영상 길이에 맞춰 순차 처리                          |
| `4`  | 전체 과목 미제출 과제 조사        | 교과 과목을 순회하여 `미제출` 또는 `진행중` 과제를 출력                            |
| `5`  | 기간 내 미완료 이러닝 자동 시청   | 전 과목에서 현재 기간 내 `학습중(지각)` 또는 `미학습(결석)` 차시를 찾아 순차 처리  |
| `6`  | 현재 수행 가능한 미제출 과제 목록 | 전 과목에서 현재 제출 기간 안에 있으며 제출 완료되지 않은 과제를 출력              |
| `7`  | 과제 선택 및 본문 보기            | 메뉴 `6`과 같은 조건의 과제를 선택하고 상세 화면의 `과제내용` 본문만 정리하여 출력 |

메뉴 `5`는 탐색 후 자동 시청 여부를 묻습니다. 기본값은 `Y`입니다.

```text
총 3개 차시를 자동 시청할까요? (Y/n) [기본값: Y]:
```

여러 항목을 선택할 때는 번호를 쉼표로 구분합니다.

```text
번호들을 쉼표로 구분하여 입력 (예: 1,2,5): 1,3,4
```

다운로드 파일은 기본적으로 `downloads/<과목명>/<차시명>.mp4`에 저장됩니다.

## 자동 시청 상태 UI

`auto-manager`에서 자동 시청을 실행하면 TTY 터미널에 3줄 고정 상태 영역이 표시됩니다. 반복 로그를 계속 쌓지 않고 같은 위치를 갱신합니다.

```text
[ElearningSession] 학습 중... (서버 학습 률: 31.6%, 누적 180초) ⠴
[ElearningSession] 학습 이력 갱신 대기 중...
|████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░|  31.6% 15분 48초 / 50분 0초
```

- 첫 번째 줄은 서버가 `addStudyRecord` 응답으로 반환한 `prgrRatio` 기반 학습률과 누적 시간을 표시하고 `⠋`, `⠙`, `⠹`, `⠸`, `⠼`, `⠴` 스피너를 순환합니다.
- 서버 학습률이 소수점 문자열로 반환되면 표시값도 소수점 형식을 유지합니다.
- 두 번째 줄의 점은 `.`, `..`, `...` 순서로 반복됩니다.
- `viewLessonStudyDetail` 확인 직후 두 번째 줄은 확인 메시지로 바뀝니다.
- 확인 메시지는 초록색으로 시작하여 약 `5`초 동안 흰색으로 변한 뒤 대기 상태로 돌아갑니다.
- 세 번째 줄은 기존 로컬 경과 시간 기준 진행바입니다. 첫 번째 줄의 서버 학습률과 다를 수 있습니다.
- TTY가 아닌 출력 환경에서는 ANSI 커서 이동을 사용하지 않고 단일 진행 줄만 갱신합니다.
- `NO_COLOR` 환경 변수를 설정하면 색상 효과를 비활성화할 수 있습니다.

## 과제 본문 출력

메뉴 `7`은 상세 페이지 전체 텍스트를 출력하지 않습니다. 과제 화면에서 라벨이 `과제내용`인 영역 내부의 `.note-editable`만 선택합니다.

처리 순서는 다음과 같습니다.

```text
과제 상세 HTML
  -> 과제내용 라벨이 있는 .inline.field 선택
  -> 내부 .note-editable 선택
  -> <br>과 블록 요소를 줄바꿈으로 변환
  -> 각 줄의 연속 공백 정리
  -> 빈 줄 제거
  -> 줄 유형별 색상 적용
```

출력 시 원문을 요약하거나 문장을 다시 작성하지 않습니다.

| 줄 형식                       | 출력 스타일             |
| :---------------------------- | :---------------------- |
| `1.`, `2.` 같은 번호 항목     | 번호를 노란색 굵은 글씨 |
| `<제출물>` 같은 소제목        | 청록색 굵은 글씨        |
| `*`, `-`, `•`로 시작하는 항목 | 기호를 초록색 굵은 글씨 |
| 일반 문장                     | 기본 터미널 색상        |

e-campus 화면 템플릿이 변경되어 `.note-editable`이 사라지면 `상세 화면에서 과제내용을 찾지 못했습니다.`가 출력됩니다.

## 인증과 세션 처리

로그인은 다음 순서로 동작합니다.

```text
아이디·비밀번호 입력
  -> 레거시 암호화 모듈로 encryptData 생성
  -> 로그인 페이지 선행 방문
  -> 로그인 요청
  -> tough-cookie CookieJar에 쿠키 저장
  -> 다음 실행에서 저장 쿠키 재사용
```

`auto-manager`는 작업 중 `SESSION_EXPIRED` 또는 로그인 관련 오류 문구를 감지하면 저장된 계정 정보 또는 `.env` 값으로 재로그인을 시도하고 원래 작업을 한 번 다시 실행합니다.

## ElearningSession 동작

`src/ecampus/elearning.ts`의 `ElearningSession`은 단일 차시의 학습 기록 라이프사이클을 처리합니다.

```text
lessonNewWindow 호출
  -> viewLessonCmnt 호출
  -> 최초 addStudyRecord 호출(60초)
  -> 응답 prgrRatio를 서버 학습률 표시값에 반영
  -> studyDetailId 확보
  -> 첫 갱신을 25~35초 후 실행
  -> 이후 45~75초 간격으로 누적 시간을 60초씩 증가
  -> addStudyRecord 응답의 prgrRatio로 서버 학습률 갱신
  -> 갱신마다 viewLessonStudyDetail 확인
  -> 종료 시 exitStudy 호출
```

`auto-manager`는 이 세션을 영상 길이만큼 유지하고, 복수 차시는 순차적으로 처리합니다.

## 라이브러리 API

패키지 엔트리 포인트는 `src/index.ts`입니다.

### 로그인과 과목 조회

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

### 강의실 리소스 조회

```typescript
const notices = await client.getNoticeList({ crsCreCd: "COURSE_CODE" });
const materials = await client.getMaterialList({ crsCreCd: "COURSE_CODE" });
const assignments = await client.getAssignmentList({
  crsCreCd: "COURSE_CODE",
  userNo: "USER_NO"
});

const resources = await client.getClassroomResources({
  crsCreCd: "COURSE_CODE",
  userNo: "USER_NO"
});
```

### 이러닝 조회와 다운로드

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

### 주요 EcampusClient 메서드

| 메서드                     | 설명                                             |
| :------------------------- | :----------------------------------------------- |
| `login()`                  | 계정 정보로 로그인하고 쿠키 저장                 |
| `ensureAuthenticated()`    | 사용 가능한 쿠키가 없으면 저장된 계정으로 로그인 |
| `getCourseList()`          | 전체 과목 목록 조회                              |
| `getCourseGroups()`        | 교과·비교과 과목 그룹 조회                       |
| `getNoticeList()`          | 공지사항 조회                                    |
| `getMaterialList()`        | 강의자료 조회                                    |
| `getAssignmentList()`      | 개인별 과제 목록과 제출 상태 조회                |
| `getClassroomResources()`  | 공지·강의자료·과제 병렬 통합 조회                |
| `getElearningLessonList()` | 이러닝 차시 목록 조회                            |
| `openLessonWindow()`       | 차시 시청 창 메타데이터 조회                     |
| `getElearningMp4Url()`     | 콘텐츠 페이지에서 MP4 주소 분석                  |
| `downloadElearningMp4()`   | 영상을 스트림 방식으로 저장                      |
| `addStudyRecord()`         | 단일 학습 기록 요청 전송                         |
| `viewLessonStudyDetail()`  | 학습 이력 상세 정보 조회                         |

## 미디어 주소 분석

MP4 주소는 다음 순서로 탐색합니다.

```text
콘텐츠 페이지 요청
  -> <source type="video/mp4"> 또는 #lessonVodSrc 확인
  -> eplus.seowon.ac.kr WebContentStorage MP4 패턴 확인
  -> VideoPlayerWidgetViewModel Base64 설정값 확인
  -> MP4 주소 반환 또는 실패 정보 반환
```

콘텐츠 유형은 `mp4`, `hls`, `youtube`, `ted`, `doczoom`, `url`, `unknown`으로 분류합니다. 현재 다운로드 구현은 MP4 주소가 확보된 경우를 대상으로 합니다.

## 프로젝트 구조

```text
src/
  index.ts                     패키지 공개 API
  cli-ui.ts                    CLI 색상, 입력, 진행바
  ecampus/
    login.ts                   EcampusClient와 HTTP 요청 래퍼
    crypto.ts                  로그인 encryptData 생성
    cookies.ts                 쿠키 저장·복원과 유효성 확인
    courses.ts                 과목 목록 파싱
    classroom.ts               공지·자료·과제 파싱
    elearning.ts               이러닝 파싱, 다운로드, 학습 세션
    legacy/login-crypto.cjs     생성된 레거시 로그인 암호화 모듈
scripts/
  build-legacy-crypto.cjs      원본 NICE 스크립트에서 레거시 모듈 재생성
  copy-legacy.cjs              빌드 결과에 레거시 모듈 복사
  register-ts-node.mjs         CLI TypeScript 실행 로더
  analyze-saz.mjs              SAZ 패킷 분석 도구
prompt-client.js               개별 API 진단 CLI
auto-manager.ts                반복 작업 CLI
```

## 개발 명령어

| 명령어                  | 설명                                     |
| :---------------------- | :--------------------------------------- |
| `npm run prompt:client` | 개별 API 진단 CLI 실행                   |
| `npm run auto:manager`  | 반복 작업 CLI 실행                       |
| `npm run analyze:saz`   | SAZ 패킷 분석                            |
| `npm run typecheck`     | TypeScript 검사                          |
| `npm run format:check`  | Prettier 검사                            |
| `npm run lint`          | ESLint 검사                              |
| `npm test`              | Vitest 실행                              |
| `npm run build`         | 레거시 암호화 모듈 재생성 후 패키지 빌드 |

## 빌드와 로컬 원본 파일

`npm run build`, `npm test`, `npm run prepack`, `npm run test:login`은 먼저 `scripts/build-legacy-crypto.cjs`를 실행합니다.

이 스크립트는 Git에서 제외된 로컬 원본 파일을 필요로 합니다.

```text
files/ecam/ecamjs/nice.nuguya.oivs.crypto.js
files/ecam/ecamjs/nice.nuguya.oivs.util.js
files/ecam/ecamjs/nice.nuguya.oivs.msg.js
```

원본 파일이 없으면 레거시 모듈을 재생성할 수 없으므로 위 명령은 실패합니다. 이미 생성되어 추적 중인 `src/ecampus/legacy/login-crypto.cjs`가 있으면 CLI 실행은 가능합니다.

## 로컬 파일과 보안

다음 파일과 폴더는 커밋하지 않습니다.

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
handover.txt
```

`test/`, `files/`, `handover.txt`는 로컬 검증과 인수인계를 위한 자료이며 `.gitignore`에 포함되어 있습니다. 공개 저장소에 올리기 전에는 개인정보와 LMS 캡처 데이터가 없는지 반드시 확인하십시오.
