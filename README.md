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

## 💎 설계 원칙 (Senior Standard)

본 프로젝트는 단순한 크롤러를 넘어 **Senior Software Engineer**의 설계 철학을 담고 있습니다.

*   **WHY-centric Documentation**: 설계 의도와 비즈니스 로직(봇 탐지 회피, 서버 응답 유연성 등)의 배경을 설명하는 전문 주석 체계.
*   **Full JSDoc Support**: 모든 API와 내부 함수에 상세한 한국어 JSDoc 명세를 제공하여 타입 정의만으로 즉시 개발 가능.
*   **Production Reliability**: 세션 만료 자동 감지, 병렬 스트림 최적화, 표준 프로토콜 준수 등 실제 환경에서의 무결성 보장.

---

## 🚀 핵심 도구 안내

### 1. ⚡ 실전 자동화 매니저 (`auto-manager.ts`)
대량 작업을 위한 고성능 스크립트입니다. `npm run auto:manager`로 실행합니다.
*   **📥 병렬 일괄 다운로드**: 여러 영상을 동시에 다운로드하며, 다중 진행바로 상태를 실시간 확인합니다.
*   **⏳ 순차 자동 시청**: 선택한 모든 강의를 영상 길이에 맞춰 자동으로 이어서 시청하고 세션을 정리합니다.
*   **🔍 미제출 과제 전수 조사**: 모든 교과 과목을 순회하여 미제출/진행중 과제를 즉시 리스팅합니다.

### 2. 🤖 정밀 학습 인증 엔진 (`ElearningSession`)
*   Fiddler 패킷 분석 기반의 6단계 인증 시퀀스 자동화.
*   45~75초 유동적 랜덤 딜레이 적용으로 봇 탐지 회피.
*   실시간 학습 진행률(`prgrRatio`) 동기화 및 마일스톤 알림.

### 3. 🎬 지능형 미디어 분석
*   다중 추출 엔진(Regex, Base64 Fallback)을 통한 고해상도 MP4 도출.
*   1MB 하이워터마크 버퍼를 적용한 고속 스트리밍 다운로드.

---

## 🛠 Usage Examples (Library API)

### 1️⃣ 인증 및 세션 (로그인)
서원대 e-campus는 `encryptData`라는 특수 암호화 패킷을 요구합니다. **본 라이브러리는 모든 암호화 로직을 내장**하고 있어, 평문 계정 정보만으로 즉시 세션을 획득합니다.

```typescript
import { createEcampusClient } from 'seowon-client-api';

const client = createEcampusClient({
  cookieFilePath: './cookies.json' // 세션을 파일로 영구 보관
});

// 로그인 수행 (내부적으로 암호화 로직 자동 실행 및 쿠키 저장)
await client.login({
  userId: '202612345',
  password: 'your_password'
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
  crsCreCd: '2026_1_000000_01'
});

notices.forEach(n => console.log(`[공지] ${n.title} (${n.date})`));
```

### 4️⃣ 과제함 (Assignments)
개인별 과제 목록과 제출 상태(제출완료/미제출/진행중)를 상세히 조회합니다.

```typescript
// 과제 목록 및 제출 상태 조회 (userNo 필수)
const assignments = await client.getAssignmentList({
  crsCreCd: '2026_1_000000_01',
  userNo: '202612345'
});

assignments.forEach(a => console.log(`${a.title}: ${a.status}`));
```

### 5️⃣ 강의자료 및 리소스 (Materials)
강의자료실의 항목과 첨부파일 유무를 확인하고, 모든 리소스를 한 번에 패키지로 획득합니다.

```typescript
// 📂 강의자료실 조회
const materials = await client.getMaterialList({ crsCreCd: '...' });

// 📦 공지/과제/자료 통합 획득
const resources = await client.getClassroomResources({
  crsCreCd: '...',
  userNo: '...'
});
```

### 6️⃣ e-러닝 차시 정보 및 MP4 분석
주차별 강의 목록과 각 영상의 실제 스트리밍 주소를 도출합니다.

```typescript
// 이러닝 차시 목록 조회
const lessons = await client.getElearningLessonList({ crsCreCd: '...' });

// 지능형 엔진을 통한 실제 MP4 URL 추출 (Base64 Fallback 포함)
const urlResult = await client.getElearningMp4Url('CRS_CODE', 'CNTS_ID');
if (urlResult.success) {
  console.log(`원본 주소: ${urlResult.mp4Url}`);
}
```

---

## 💻 CLI 전문가 명령어 가이드

| 명령어 | 설명 |
| :--- | :--- |
| `courses` | 현재 수강 중인 전체 과목 정보 출력 |
| `notices` | 특정 과목의 최신 공지 목록 파싱 |
| `assignments` | 과제 목록 및 개인별 제출 상태 확인 |
| `elearning-watch` | 실시간 학습 인증 및 진행률 모니터링 |
| `elearning-download`| 고속 스트림 방식으로 영상 로컬 저장 |
| `status` | (학습 중 전용) 현재 실시간 진행률 즉시 확인 |

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

> [!CAUTION]
> **보안 및 정책 가이드라인**
> *   본 프로젝트는 공유를 위해 코드 내 모든 실제 개인 정보를 제거했습니다.
> *   사용 시 해당 대학의 정보 보안 지침 및 LMS 운영 정책을 반드시 준수해야 합니다.
> *   세션 정보가 담긴 쿠키 파일(`.json`) 유출에 각별히 유의하십시오.
