# 🏫 seowon-client-api

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <b>서원대학교 e-campus(LMS) 연동을 위한 엔터프라이즈급 TypeScript 클라이언트 라이브러리 및 CLI 도구</b><br />
  실제 사용자 행동 모사를 통한 정밀 학습 자동화 및 지능형 미디어 분석 엔진을 제공합니다.
</p>

---

## 💎 설계 원칙 (Senior Standard)

본 프로젝트는 단순한 크롤러를 넘어 **Senior Software Engineer**의 설계 철학을 담고 있습니다.

*   **Architectural Intent**: 설계 의도와 비즈니스 로직(봇 탐지 회피 등)의 배경을 설명하는 전문 주석 체계.
*   **Full JSDoc Support**: 모든 API에 상세한 한국어 JSDoc 명세를 제공하여 타입 정의만으로도 즉시 개발 가능.
*   **Production Reliability**: 서버 응답 유연성 처리, 표준 프로토콜 준수 등 실제 환경에서의 무결성을 최우선으로 설계.

---

## 🚀 핵심 기능 (CLI & Library)

인터랙티브 CLI 도구(`prompt-client.js`)에서 제공하는 모든 기능을 라이브러리 API로도 동일하게 사용할 수 있습니다.

### 🤖 정밀 학습 자동화 (`ElearningSession`)
*   **6단계 인증 시퀀스**: `창 열기` → `콘텐츠 진입` → `기록 시작` → `가변 딜레이 반복` → `이력 검증` → `종료 패킷`을 완벽히 자동화.
*   **지능형 봇 회피**: 45~75초 사이의 유동적인 랜덤 딜레이를 적용하여 실제 시청 패턴을 완벽히 재현.
*   **실시간 상태 동기화**: 진행률(`prgrRatio`) 실시간 파싱 및 마일스톤 알림 제공.

### 🎬 지능형 미디어 분석 및 다운로드
*   **다중 추출 엔진**: Regex 매칭 및 Base64 Fallback 전략을 동원하여 실제 MP4 URL 도출.
*   **안정적 스트리밍**: 대용량 영상의 안정적인 청크 기반 다운로드 지원.

### 📂 통합 강의실 리소스 관리
*   **원스톱 데이터 추출**: 수강 과목, 공지사항, 과제 정보, 강의자료실 데이터를 단일 인터페이스로 통합 조회.

---

## 🛠 Usage Examples (Library API)

개발자는 `EcampusClient`를 사용하여 자신의 프로젝트에 서원대 LMS 기능을 연동할 수 있습니다.

### 1️⃣ 인증 및 세션 관리 (로그인)
서원대 e-campus는 `encryptData`라는 특수 암호화 패킷을 요구합니다. **본 라이브러리는 모든 암호화 로직을 내장**하고 있어, 개발자가 별도로 암호화 함수를 호출할 필요가 없습니다.

```typescript
import { createEcampusClient } from 'seowon-client-api';

const client = createEcampusClient({
  cookieFilePath: './cookies.json' // 세션 유지를 위해 파일 경로 지정을 권장합니다.
});

/**
 * 로그인 시 내부적으로 레거시 암호화 모듈을 호출하여
 * 서버 전송용 encryptData를 자동으로 생성 및 전송합니다.
 */
await client.login({
  userId: '202612345',
  password: 'your_secure_password'
});
```

---

### 2️⃣ 수강 과목 목록 조회
현재 학기에 활성화된 모든 교과 및 비교과 과목 목록을 가져옵니다.

```typescript
// 전체 과목 목록 (과목명, 강의실 코드 포함)
const courses = await client.getCourseList();

courses.forEach(course => {
  console.log(`[${course.crsTypeCd}] ${course.title} (${course.crsCreCd})`);
});
```

---

### 3️⃣ 공지사항 및 강의자료 조회
강의실 내 게시판 데이터를 파싱합니다. 각 항목은 상세 보기를 위한 `request` 객체를 포함합니다.

```typescript
const crsCreCd = '2026_1_008620_01';

// 📢 공지사항 목록
const notices = await client.getNoticeList({ crsCreCd });

// 📂 강의자료실 목록 (첨부파일 유무 확인 가능)
const materials = await client.getMaterialList({ crsCreCd });

console.log(`최신 공지: ${notices[0]?.title}`);
```

---

### 4️⃣ 과제함 및 제출 상태 조회
개인별 과제 목록과 해당 과제의 현재 제출 상태(제출완료/미제출 등)를 조회합니다.

```typescript
const options = {
  crsCreCd: '2026_1_008620_01',
  userNo: '202612345' // 과제 조회 시 학생 식별 번호가 필수입니다.
};

const assignments = await client.getAssignmentList(options);

assignments.forEach(item => {
  console.log(`${item.title}: ${item.status} (${item.period})`);
});
```

---

### 5️⃣ e-러닝(온라인 강의) 목록 및 정보
주차별 강의 목록과 각 영상의 길이를 조회합니다.

```typescript
const lessons = await client.getElearningLessonList({
  crsCreCd: '2026_1_008620_01'
});

// 차시별 제목 및 재생 시간 정보 확인
lessons.forEach(lesson => {
  console.log(`${lesson.title} - ${lesson.durationText}`);
});
```

---

### 6️⃣ 실시간 학습 자동화 세션
Fiddler 로그 분석을 기반으로 설계된 시나리오를 통해 실제 시청 이력을 서버에 적재합니다.

```typescript
import { watchLesson } from 'seowon-client-api';

// 세션 시작 (종료 시 exitStudy 패킷 전송을 보장함)
const session = await watchLesson(
  client.http, 
  client.baseUrl,
  'CNTS_ID_HERE', 
  'COURSE_CODE_HERE',
  '202612345'
);

// 현재 진행률 실시간 확인 (prgrRatio 연동)
console.log(`학습 시작 진행률: ${session.getProgressPercent()}%`);
```

---

## 💻 CLI 전문가 가이드

인터랙티브 CLI를 통해 모든 기능을 즉시 사용할 수 있습니다.

| 번호 | 기능 | 명령어 (Alias) | 설명 |
| :--- | :--- | :--- | :--- |
| **1** | **로그인** | `login` | 세션 초기화 및 로컬 세션 정보 저장 |
| **2** | **과목 목록** | `courses` | 현재 수강 중인 과목 및 강의실 코드 확인 |
| **3** | **공지사항** | `notices` | 선택한 과목의 최신 공지 목록 파싱 |
| **5** | **과제함** | `assignments` | 과제 목록 및 개인별 제출 상태 확인 |
| **6** | **강의실 자료** | `classroom-resources` | 공지/과제/자료 통합 조회 |
| **7** | **이러닝 목록** | `elearning-lessons` | 주차별 온라인 강의 정보 확인 |
| **11** | **자동 시청** | `elearning-watch` | 실시간 학습 인증 및 진행률 모니터링 |

---

## 🛠 기술 스택

| Category | Technology |
| :--- | :--- |
| **Runtime** | `Node.js (20+)` |
| **Language** | `TypeScript (Strict Mode)` |
| **Network** | `Axios`, `tough-cookie` |
| **Scraping** | `Cheerio` |
| **CLI Control** | `Readline (Advanced Cursor Control)` |

---

## ⚠️ 주의사항

> [!IMPORTANT]
> **보안 및 정책 준수 가이드**
> *   본 도구는 **교육 및 연구 목적**으로 제작되었습니다.
> *   사용 시 해당 대학의 정보 보안 지침 및 LMS 운영 정책을 반드시 준수해야 하며, 모든 사용 책임은 사용자 본인에게 있습니다.
> *   세션 정보가 포함된 쿠키 파일(`.json`)은 비밀번호와 동일한 가치를 지니므로 유출에 각별히 유의하십시오.
