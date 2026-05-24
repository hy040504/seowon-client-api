# 🏫 seowon-client-api

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <b>서원대학교 e-campus(LMS) 연동을 위한 엔터프라이즈급 TypeScript 클라이언트 라이브러리 및 CLI 도구</b><br />
  실제 사용자 행동 모사를 통한 정밀 학습 자동화 및 지능형 병렬 미디어 분석 엔진을 제공합니다.
</p>

---

## 🧩 프로젝트 로직 구성

이 프로젝트는 서원대학교 e-campus의 화면 흐름을 코드로 재현해 로그인, 과목 조회, 강의실 자료 조회, 이러닝 차시 분석, 영상 다운로드와 학습 기록 갱신을 하나의 클라이언트로 묶습니다.

### 1. 인증과 세션 유지

로그인은 `createEcampusClient()`가 만든 클라이언트를 통해 수행합니다. 서버가 요구하는 `encryptData` 값을 내부 암호화 모듈에서 생성한 뒤 로그인 요청을 보내고, 성공 시 쿠키를 `.seowon-ecampus.cookies.json`에 저장합니다.

```text
아이디/비밀번호 입력
  -> encryptData 생성
  -> 로그인 요청
  -> tough-cookie CookieJar에 세션 저장
  -> 다음 실행 때 쿠키 재사용
```

`auto-manager`는 작업 중 세션 만료가 의심되는 오류를 만나면 저장된 계정 정보로 재로그인을 시도하고, 원래 작업을 다시 실행합니다.

### 2. 과목과 강의실 데이터 조회

과목 목록은 e-campus의 과목 목록 HTML/응답을 파싱해 교과/비교과 과목 정보를 정리합니다. 이후 사용자가 과목을 선택하면 해당 과목의 `crsCreCd`를 기준으로 공지, 자료, 과제, 강의실 리소스를 조회합니다.

```text
과목 목록 조회
  -> 사용자가 과목 선택
  -> crsCreCd 확보
  -> 공지/자료/과제/강의실 리소스 API 호출
  -> Cheerio 기반 HTML 파싱
  -> TypeScript 객체 배열로 반환
```

### 3. 이러닝 차시 분석

이러닝 목록 화면에서는 주차, 차시 ID, 제목, 재생 시간, 출결 상태를 추출합니다. 각 차시에는 실제 강의 진입과 재생 창 열기에 필요한 요청 정보가 함께 구성됩니다.

```text
이러닝 목록 HTML
  -> 주차 섹션 파싱
  -> 차시별 lessonCntsId 추출
  -> 강의 진입 POST 요청 생성
  -> 재생 창 POST 요청 생성
  -> EcampusLessonItem 배열 반환
```

### 4. 영상 URL 분석과 다운로드

영상 다운로드는 먼저 차시 재생 창을 열어 콘텐츠 URL을 찾고, MP4/HLS/외부 콘텐츠 여부를 판별합니다. 다운로드 가능한 MP4 주소가 확인되면 스트림 방식으로 파일을 저장하고 진행률을 콜백으로 전달합니다.

```text
과목 선택
  -> 차시 선택
  -> 재생 창 요청
  -> 콘텐츠 URL 분석
  -> MP4 주소 확인
  -> downloads/ 폴더에 스트리밍 저장
```

`auto-manager`의 일괄 다운로드는 여러 차시를 대기열로 만들고, 사용자가 지정한 동시 작업 수에 맞춰 병렬로 처리합니다.

### 5. 학습 세션과 진행 기록

자동 시청은 `ElearningSession`이 담당합니다. 강의 재생 창 진입, 학습 상세 정보 확인, 최초 학습 기록 생성, 주기적 학습 기록 갱신, 종료 패킷 전송 순서로 동작합니다.

```text
lessonNewWindow 호출
  -> viewLessonStudyDetail 확인
  -> addStudyRecord 최초 호출
  -> 일정 주기로 addStudyRecord 갱신
  -> 종료 시 exitStudy 호출
```

이 로직은 단일 차시 시청에도 사용할 수 있고, `auto-manager`에서는 여러 차시를 선택해 순차적으로 실행할 수 있습니다.

### 6. 실행 도구의 역할 분리

`prompt-client`는 API 응답과 파싱 결과를 직접 확인하는 진단용 도구입니다. 반면 `auto-manager`는 실제 반복 작업을 처리하기 위한 도구로, 로그인 갱신, 일괄 다운로드, 순차 시청, 미제출 과제 조사를 메뉴 기반으로 제공합니다.

---

## 🚀 핵심 도구 안내

### 1. ⚡ 실전 자동화 매니저 (`auto-manager.ts`)

대량 작업을 위한 고성능 스크립트입니다. `npm run auto:manager`로 실행합니다.

- **📥 병렬 일괄 다운로드**: 여러 영상을 동시에 다운로드하며, 다중 진행바로 상태를 실시간 확인합니다.
- **⏳ 순차 자동 시청**: 선택한 모든 강의를 영상 길이에 맞춰 자동으로 이어서 시청하고 세션을 정리합니다.
- **🔍 미제출 과제 전수 조사**: 모든 교과 과목을 순회하여 미제출/진행중 과제를 즉시 리스팅합니다.

### 2. 🤖 정밀 학습 인증 엔진 (`ElearningSession`)

- Fiddler 패킷 분석 기반의 6단계 인증 시퀀스 자동화.
- 45~75초 유동적 랜덤 딜레이 적용으로 봇 탐지 회피.
- 실시간 학습 진행률(`prgrRatio`) 동기화 및 마일스톤 알림.

### 3. 🎬 지능형 미디어 분석

- 다중 추출 엔진(Regex, Base64 Fallback)을 통한 고해상도 MP4 도출.
- 1MB 하이워터마크 버퍼를 적용한 고속 스트리밍 다운로드.

---

## 🧭 CLI 실행 가이드

이 프로젝트는 목적이 다른 두 개의 인터랙티브 실행 도구를 제공합니다.

| 도구            | 실행 명령어             | 사용 목적                                      | 추천 상황                          |
| :-------------- | :---------------------- | :--------------------------------------------- | :--------------------------------- |
| `prompt-client` | `npm run prompt:client` | API 기능을 하나씩 직접 호출하고 응답 JSON 확인 | 파서/로그인/개별 기능 테스트       |
| `auto-manager`  | `npm run auto:manager`  | 다운로드, 자동 시청, 과제 조사 일괄 처리       | 실제 반복 작업을 한 번에 처리할 때 |

### 0️⃣ 실행 전 준비

먼저 `.env.example`을 기준으로 `.env` 파일을 준비합니다.

```env
SEOWON_ID=your_id
SEOWON_PASSWORD=your_password
DOWNLOAD_HIGH_WATER_MARK=1024
```

- `SEOWON_ID`, `SEOWON_PASSWORD`: 로그인 자동 입력 및 세션 갱신에 사용됩니다.
- `DOWNLOAD_HIGH_WATER_MARK`: 영상 다운로드 버퍼 크기입니다. 기본값은 `1024`KB입니다.
- 로그인 성공 후 세션 쿠키는 `.seowon-ecampus.cookies.json`에 저장되어 다음 실행 때 재사용됩니다.

### 1️⃣ `prompt-client`: 개별 API 확인용

```bash
npm run prompt:client
```

실행하면 명령어 목록이 표시되고, 원하는 기능을 선택해 API 응답을 바로 확인할 수 있습니다.

| 메뉴/명령어           | 동작                                      |
| :-------------------- | :---------------------------------------- |
| `login`               | 계정으로 로그인하고 쿠키 세션 저장        |
| `courses`             | 현재 수강 중인 과목 목록 출력             |
| `notices`             | 선택한 과목의 공지사항 조회               |
| `materials`           | 선택한 과목의 강의자료 조회               |
| `assignments`         | 선택한 과목의 과제 및 제출 상태 조회      |
| `classroom-resources` | 공지/자료/과제 리소스 통합 조회           |
| `elearning-lessons`   | 선택한 과목의 이러닝 차시 목록 조회       |
| `elearning-download`  | 선택한 차시의 영상 분석 후 다운로드       |
| `elearning-watch`     | 선택한 차시의 학습 세션 시작 및 기록 갱신 |

권장 흐름:

```text
login -> courses -> 원하는 과목 선택 -> notices/materials/assignments/elearning-lessons
```

`prompt-client`는 라이브러리 API가 어떤 데이터를 반환하는지 빠르게 확인하는 용도입니다. 대량 다운로드나 여러 강의 자동 시청은 `auto-manager`를 사용하세요.

### 2️⃣ `auto-manager`: 실전 자동화용

```bash
npm run auto:manager
```

실행 시 기존 쿠키 세션이 유효하면 바로 메인 메뉴로 진입하고, 세션이 없거나 만료되면 로그인 정보를 입력받습니다.

```text
[메인 메뉴]
1. 로그인 / 로그인 정보 갱신
2. 이러닝 일괄 다운로드 (전체 대기열 시각화)
3. 이러닝 순차 자동 시청 (고급 로그 제어)
4. 전체 교과목 미제출 과제 전수 조사
0. 종료
```

| 메뉴 | 기능                  | 사용 방법                                                 |
| :--- | :-------------------- | :-------------------------------------------------------- |
| `1`  | 로그인/세션 갱신      | 계정 정보를 다시 입력해 쿠키 세션을 새로 저장             |
| `2`  | 이러닝 일괄 다운로드  | 과목 선택 → 다운로드할 차시 번호 선택 → 동시 작업 수 입력 |
| `3`  | 이러닝 순차 자동 시청 | 과목 선택 → 시청할 차시 번호 선택 → 학번 확인             |
| `4`  | 미제출 과제 전수 조사 | 전체 과목을 순회하며 미제출/진행중 과제를 출력            |

여러 항목을 선택할 때는 번호를 쉼표로 입력합니다.

```text
번호들을 쉼표로 구분하여 입력 (예: 1,2,5): 1,3,4
```

다운로드 결과는 기본적으로 `downloads/` 폴더에 저장됩니다. 세션 만료가 감지되면 `.env`의 계정 정보 또는 저장된 인증 정보로 자동 재로그인을 시도한 뒤 작업을 재개합니다.

---

## 🛠 Usage Examples (Library API)

### 1️⃣ 인증 및 세션 (로그인)

서원대 e-campus는 `encryptData`라는 특수 암호화 패킷을 요구합니다. **본 라이브러리는 모든 암호화 로직을 내장**하고 있어, 평문 계정 정보만으로 즉시 세션을 획득합니다.

```typescript
import { createEcampusClient } from "seowon-client-api";

const client = createEcampusClient({
  cookieFilePath: "./cookies.json" // 세션을 파일로 영구 보관
});

// 로그인 수행 (내부적으로 암호화 로직 자동 실행 및 쿠키 저장)
await client.login({
  userId: "202612345",
  password: "your_password"
});
```

### 2️⃣ 과목 목록 (Courses)

현재 학기에 수강 중인 모든 과목을 교과/비교과로 분류하거나 평탄화된 배열로 가져옵니다.

```typescript
// 전체 과목 목록 가져오기
const courses = await client.getCourseList();

// 교과/비교과 그룹화 정보 가져오기
const groups = await client.getCourseGroups();
console.log(`교과 과목 수: ${groups.curricular.length}`);
```

### 3️⃣ 공지사항 (Notices)

강의실 내 공지사항 게시판의 최신 항목들을 파싱합니다.

```typescript
// 특정 과목의 공지사항 조회
const notices = await client.getNoticeList({
  crsCreCd: "2026_1_000000_01"
});

notices.forEach((n) => console.log(`[공지] ${n.title} (${n.date})`));
```

### 4️⃣ 과제함 (Assignments)

개인별 과제 목록과 제출 상태(제출완료/미제출/진행중)를 상세히 조회합니다.

```typescript
// 과제 목록 및 제출 상태 조회 (userNo 필수)
const assignments = await client.getAssignmentList({
  crsCreCd: "2026_1_000000_01",
  userNo: "202612345"
});

assignments.forEach((a) => console.log(`${a.title}: ${a.status}`));
```

### 5️⃣ 강의자료 및 리소스 (Materials)

강의자료실의 항목과 첨부파일 유무를 확인하고, 모든 리소스를 한 번에 패키지로 획득합니다.

```typescript
// 📂 강의자료실 조회
const materials = await client.getMaterialList({ crsCreCd: "..." });

// 📦 공지/과제/자료 통합 획득
const resources = await client.getClassroomResources({
  crsCreCd: "...",
  userNo: "..."
});
```

### 6️⃣ e-러닝 차시 정보 및 MP4 분석

주차별 강의 목록과 각 영상의 실제 스트리밍 주소를 도출합니다.

```typescript
// 이러닝 차시 목록 조회
const lessons = await client.getElearningLessonList({ crsCreCd: "..." });

// 지능형 엔진을 통한 실제 MP4 URL 추출 (Base64 Fallback 포함)
const urlResult = await client.getElearningMp4Url("CRS_CODE", "CNTS_ID");
if (urlResult.success) {
  console.log(`원본 주소: ${urlResult.mp4Url}`);
}
```

---

## 💻 CLI 전문가 명령어 가이드

| 명령어               | 설명                                        |
| :------------------- | :------------------------------------------ |
| `courses`            | 현재 수강 중인 전체 과목 정보 출력          |
| `notices`            | 특정 과목의 최신 공지 목록 파싱             |
| `assignments`        | 과제 목록 및 개인별 제출 상태 확인          |
| `elearning-watch`    | 실시간 학습 인증 및 진행률 모니터링         |
| `elearning-download` | 고속 스트림 방식으로 영상 로컬 저장         |
| `status`             | (학습 중 전용) 현재 실시간 진행률 즉시 확인 |

---

## 🛠 기술 스택

| Category        | Technology                           |
| :-------------- | :----------------------------------- |
| **Runtime**     | `Node.js (20+)`                      |
| **Language**    | `TypeScript (Strict Mode)`           |
| **Network**     | `Axios`, `tough-cookie`              |
| **Scraping**    | `Cheerio`                            |
| **CLI Control** | `Readline (Advanced Cursor Control)` |

---

## ⚠️ 주의사항

> [!CAUTION]
> **보안 및 정책 가이드라인**
>
> - 본 프로젝트는 서원대학교 이캠퍼스 비공식 클라이언트 모듈입니다.
> - 사용 시 해당 대학의 정보 보안 지침 및 LMS 운영 정책을 반드시 준수해야 하며, 사용에 대한 모든 책임은 본인에게 있습니다.
> - 세션 정보가 담긴 쿠키 파일(`.json`) 유출에 각별히 유의하십시오.
