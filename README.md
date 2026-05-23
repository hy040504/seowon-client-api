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

*   **WHY-centric Documentation**: 코드의 단순 동작이 아닌, 설계 의도와 비즈니스 로직(봇 탐지 회피 등)의 배경을 설명하는 전문 주석 체계.
*   **Full JSDoc Support**: 모든 API와 내부 함수에 상세한 한국어 JSDoc 명세를 제공하여 별도의 문서 없이도 즉시 개발 가능.
*   **Production Reliability**: 서버 응답 유연성 처리, 표준 프로토콜 준수 등 실제 환경에서의 무결성을 최우선으로 설계.

---

## 🚀 핵심 기능 (CLI & Library)

인터랙티브 CLI 도구(`prompt-client.js`)에서 제공하는 모든 기능을 라이브러리 API로도 동일하게 사용할 수 있습니다.

### 🤖 정밀 학습 자동화 (`ElearningSession`)
*   **6단계 인증 시퀀스**: `창 열기` → `콘텐츠 진입` → `기록 시작` → `가변 딜레이 반복` → `이력 검증` → `종료 패킷`을 완벽히 자동화.
*   **지능형 봇 회피**: 45~75초 사이의 유동적인 랜덤 딜레이를 적용하여 실제 시청 패턴을 완벽히 재현.
*   **실시간 상태 동기화**: 서버 응답 데이터에서 진행률(`prgrRatio`)을 실시간 파싱하여 대시보드에 반영.

### 🎬 지능형 미디어 분석 및 다운로드
*   **다중 추출 엔진**: 단순 태그 분석부터 정규식 매칭, Base64 JSON Fallback 전략까지 동원하여 실제 MP4 URL 도출.
*   **안정적 스트리밍**: 대용량 영상의 안정적인 청크 기반 다운로드 및 실시간 진행률 표시.

### 📂 통합 강의실 리소스 관리
*   **원스톱 데이터 추출**: 수강 과목, 공지사항, 과제 정보, 강의자료실 데이터를 단일 인터페이스로 통합 조회 및 파싱.

---

## 🛠 Usage Examples (Library API)

개발자는 `EcampusClient`를 사용하여 자신의 프로젝트에 서원대 LMS 기능을 연동할 수 있습니다.

### 1. 초기화 및 로그인
환경 변수 또는 명시적 설정을 통해 클라이언트를 생성하고 세션을 획득합니다.

```typescript
import { createEcampusClient } from 'seowon-client-api';

const client = createEcampusClient({
  cookieFilePath: './cookies.json'
});

// 로그인 수행 (세션 쿠키 자동 저장)
await client.login({
  userId: '202612345',
  password: 'your_secure_password'
});
```

### 2. 과목 및 이러닝 목록 조회
수강 중인 과목과 해당 과목의 주차별 차시 정보를 가져옵니다.

```typescript
// 전체 과목 목록 조회
const courses = await client.getCourseList();

// 특정 과목의 이러닝 차시 목록 조회
const lessons = await client.getElearningLessonList({
  crsCreCd: courses[0].crsCreCd
});

console.log(`강의 제목: ${lessons[0].title}`);
```

### 3. 실시간 학습 자동화 실행
`ElearningSession`을 활용하여 실제 시청 패턴으로 학습 인증을 수행합니다.

```typescript
import { watchLesson } from 'seowon-client-api';

// 학습 세션 시작
const session = await watchLesson(
  client.http,
  client.baseUrl,
  'CNTS_ID_HERE',
  'COURSE_CODE_HERE',
  'STUDENT_NO_HERE'
);

// 실시간 진행률 모니터링 (예시)
setInterval(() => {
  console.log(`현재 진행률: ${session.getProgressPercent()}%`);
}, 10000);

// 특정 조건 달성 시 종료
// await session.stopWatchingLesson();
```

---

## 💻 CLI 전문가 가이드

인터랙티브 CLI를 통해 코드 한 줄 없이 모든 강력한 기능을 사용할 수 있습니다.

| 번호 | 기능 | 명령어 (Alias) | 설명 |
| :--- | :--- | :--- | :--- |
| **1** | **로그인** | `login` | 세션 초기화 및 쿠키/세션 파일 생성 |
| **2** | **과목 목록** | `courses` | 현재 수강 중인 전체 과목 정보 출력 |
| **6** | **강의실 자료** | `classroom-resources` | 공지/과제/자료를 통합하여 한눈에 파악 |
| **11** | **자동 시청** | `elearning-watch` | 목록 선택형 UI로 시청 및 학습률 자동 갱신 |
| **-** | **상태 확인** | `status` | (학습 중) 현재 실시간 진행률 즉시 확인 |

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
