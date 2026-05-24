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

### 1. 초기화 및 자동 세션 관리
로그인 시 필요한 암호화(`encryptData`)를 내부에서 자동으로 처리하며, 세션 만료 시 백그라운드 재인증을 지원합니다.

```typescript
import { createEcampusClient } from 'seowon-client-api';

const client = createEcampusClient({
  cookieFilePath: './cookies.json' // 세션 영구 보관
});

// 로그인 수행 (암호화 및 세션 저장 자동화)
await client.login({
  userId: process.env.SEOWON_ID,
  password: process.env.SEOWON_PASSWORD
});
```

### 2. 병렬 다운로드 및 진행률 모니터링
```typescript
const result = await client.downloadElearningMp4(
  'CRS_CODE', 'CNTS_ID', 'Course Name', 'Lesson Name', './downloads',
  (p) => console.log(`다운로드 진행률: ${p.percent}%`)
);
```

---

## 📦 시작하기

### 실행 명령어
```bash
# 1. 의존성 설치
npm install

# 2. 실전 매니저 실행 (강력 추천)
npm run auto:manager

# 3. 인터랙티브 기능별 CLI 실행
npm run prompt:client
```

---

## ⚠️ 보안 및 주의사항

> [!CAUTION]
> **민감 정보 관리**
> *   본 프로젝트는 공유를 위해 코드 내 모든 실제 학번과 세션 정보를 제거했습니다.
> *   `.env` 파일과 생성된 `.json` 쿠키 파일은 절대로 외부에 공유하지 마십시오.
> *   `.gitignore`에 의해 세션 데이터 및 다운로드 영상은 자동 제외 처리됩니다.
