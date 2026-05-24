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

## 🚀 핵심 도구 및 기능

### 1. ⚡ 실전 자동화 매니저 (`auto-manager.ts`)
대량의 작업을 한 번에 처리하기 위한 고성능 스크립트입니다.
*   **📥 병렬 일괄 다운로드**: 여러 영상을 동시에 다운로드하며, 각 워커의 진행 상태를 **다중 실시간 진행바**로 모니터링합니다.
*   **⏳ 순차 자동 시청**: 선택한 모든 강의를 영상 길이에 맞춰 순서대로 시청합니다. 각 세션 종료 시 서버 정합성을 위한 종료 패킷 전송을 보장합니다.
*   **🔍 미제출 과제 전수 조사**: 수강 중인 모든 "교과" 과목을 순회하여 미제출/진행중 과제를 즉시 리스팅합니다.

### 2. 🤖 정밀 학습 인증 엔진 (`ElearningSession`)
*   Fiddler 패킷 분석 기반의 6단계 인증 시퀀스 자동화.
*   45~75초 유동적 랜덤 딜레이 적용으로 봇 탐지 회피.
*   실시간 학습 진행률(`prgrRatio`) 동기화 및 마일스톤 알림.

### 3. 🎬 지능형 미디어 분석
*   다중 추출 엔진(Regex, Base64 Fallback)을 통한 고해상도 MP4 도출.
*   1MB 하이워터마크 버퍼를 적용한 고속 스트리밍 다운로드.

---

## 🛠 Usage Examples (Library API)

개발자는 `EcampusClient`를 사용하여 서원대 LMS의 모든 기능을 자신의 애플리케이션에 통합할 수 있습니다.

### 1️⃣ 초기화 및 자동 세션 관리
로그인 시 필요한 레거시 암호화(`encryptData`)를 내부에서 자동으로 처리하며, 세션 만료 시 백그라운드 재인증을 지원합니다.

```typescript
import { createEcampusClient } from 'seowon-client-api';

const client = createEcampusClient({
  cookieFilePath: './cookies.json' // 세션 정보를 영구 보관합니다.
});

// 로그인 수행 (암호화 로직 내장)
await client.login({
  userId: '202612345',
  password: 'your_password'
});
```

### 2️⃣ 수강 과목 및 강의 목록 조회
현재 학기에 활성화된 과목들과 각 과목에 등록된 온라인 강의 정보를 추출합니다.

```typescript
// 전체 수강 과목 목록 가져오기
const courses = await client.getCourseList();

// 특정 과목의 주차별 e-러닝 차시 목록 조회
const lessons = await client.getElearningLessonList({
  crsCreCd: courses[0].crsCreCd
});

console.log(`대상 강의: ${lessons[0].title} [${lessons[0].durationText}]`);
```

### 3️⃣ 강의실 게시판 리소스 파싱 (공지/자료/과제)
게시판의 텍스트 데이터와 첨부파일 유무, 과제 제출 상태 등을 정밀하게 분석합니다.

```typescript
const crsCreCd = '2026_1_000000_01';

// 📢 공지사항 및 📂 강의자료실 조회
const notices = await client.getNoticeList({ crsCreCd });
const materials = await client.getMaterialList({ crsCreCd });

// 📝 과제 목록 및 개인별 제출 상태 확인 (userNo 필수)
const assignments = await client.getAssignmentList({
  crsCreCd,
  userNo: '202612345'
});

// 📦 모든 리소스를 한 번에 패키지로 획득
const allResources = await client.getClassroomResources({
  crsCreCd,
  userNo: '202612345'
});
```

### 4️⃣ 지능형 MP4 URL 분석 및 다운로드
단순 접근이 불가능한 영상의 원본 스트리밍 주소를 도출하고 로컬에 저장합니다.

```typescript
// 1. 영상 재생을 위한 실제 MP4 주소 추출
const urlResult = await client.getElearningMp4Url(crsCreCd, lessonCntsId);

if (urlResult.success) {
  // 2. 고속 스트림 다운로드 실행 (진행률 콜백 지원)
  await client.downloadElearningMp4(
    crsCreCd, 
    lessonCntsId, 
    '과목명', 
    '강의명', 
    './downloads',
    (p) => console.log(`다운로드 중: ${p.percent}%`)
  );
}
```

### 5️⃣ 실시간 학습 자동화 세션 (`ElearningSession`)
실제 사용자의 시청 패턴을 모사하여 학습 이력을 서버에 안정적으로 적재합니다.

```typescript
import { watchLesson } from 'seowon-client-api';

// 학습 시퀀스 시작 (창 열기 -> 진입 -> 기록 시작 -> 자동 갱신)
const session = await watchLesson(
  client.http, 
  client.baseUrl, 
  'CNTS_ID', 
  'CRS_CODE', 
  'STUDENT_NO'
);

// 실시간 진행률(%) 확인
console.log(`현재 서버 반영 학습률: ${session.getProgressPercent()}%`);

// 학습 중단 및 종료 패킷(exitStudy) 전송
// await session.stopWatchingLesson();
```

---

## 📦 시작하기

### 실행 명령어
```bash
# 1. 의존성 설치
npm install

# 2. 실전 매니저 실행 (강력 추천: 일괄 다운로드 및 자동 시청)
npm run auto:manager

# 3. 인터랙티브 기능별 CLI 실행
npm run prompt:client
```

---

## ⚠️ 보안 및 주의사항

> [!CAUTION]
> **보안 가이드라인**
> *   본 프로젝트는 공유를 위해 코드 내 모든 실제 개인 정보를 제거했습니다.
> *   `.env` 파일 및 생성된 `.json` 쿠키 파일에는 실제 계정 정보가 포함되므로 외부 유출에 주의하십시오.
> *   학습 자동화 사용 시 대학의 운영 정책을 준수해야 하며, 모든 책임은 사용자에게 있습니다.
