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

## 💎 코드 품질 및 설계 원칙 (Senior Standard)

본 프로젝트는 **Senior Software Engineer** 가이드라인을 엄격히 준수하여 개발되었습니다.

*   **Architectural Intent**: 단순 기능 구현을 넘어, 설계 의도와 비즈니스 로직의 배경을 설명하는 **WHY 중심**의 전문 주석 체계를 갖추고 있습니다.
*   **Documentation First**: 모든 API와 내부 함수에 상세한 **한국어 JSDoc 명세**를 제공하여 코드 자체가 문서 역할을 수행합니다.
*   **Production Readiness**: 봇 탐지 회피, 서버 응답 유연성 처리, 표준 프로콜 준수 등 실제 환경에서의 안정성을 최우선으로 설계되었습니다.

---

## 🚀 핵심 기능

### 1. 🤖 정밀 학습 자동화 (`ElearningSession`)
*   **완벽한 시퀀스 재현**: Fiddler 패킷 분석 기반의 6단계 인증 흐름 보장.
*   **가변 랜덤 딜레이**: 45~75초 사이의 유동적 주기 적용으로 봇 탐지 완벽 회피.
*   **실시간 동기화**: 학습 진행률(`prgrRatio`) 실시간 파싱 및 마일스톤 알림 제공.
*   **안전한 종료**: 브라우저 종료 이벤트를 모사한 `exitStudy` 패킷 전송 보장.

### 2. 🎬 지능형 미디어 분석
*   **다중 추출 전략**: Regex 매칭부터 Base64 Fallback까지 동원한 고해상도 MP4 URL 도출.
*   **안정적 다운로드**: 대용량 영상의 끊김 없는 스트리밍 다운로드 지원.

### 3. 📂 통합 강의실 인터페이스
*   수강 과목, 공지사항, 과제, 강의자료실의 데이터를 단일 인터페이스로 통합 조회.

---

## 🛠 기술 스택

| Category | Technology |
| :--- | :--- |
| **Runtime** | `Node.js (20+)` |
| **Language** | `TypeScript (Strict Mode)` |
| **Network** | `Axios`, `tough-cookie (CookieJar)` |
| **Scraping** | `Cheerio (High-speed)` |
| **CLI Control** | `Readline (Advanced Cursor Control)` |

---

## 📦 시작하기

### 설치
```bash
npm install
```

### 설정
`.env` 파일을 생성하고 계정 정보를 입력합니다.
```env
SEOWON_ID=your_id
SEOWON_PASSWORD=your_password
```

### 실행 (CLI)
```bash
node prompt-client.js
```

---

## 🖥 CLI 전문가 명령어 (학습 중 전용)

| Command | Description |
| :--- | :--- |
| `status` | 현재 실시간 학습 진행률(%) 및 상세 상태 확인 |
| `clear` | 터미널 화면을 정리하여 입력 가독성 확보 |
| `stop` | 학습 중단 및 종료 패킷(`exitStudy`) 전송 후 메뉴 복귀 |

---

## ⚠️ 주의사항

> [!IMPORTANT]
> **보안 및 정책 준수**
> *   본 도구는 연구 및 교육용으로 제작되었습니다.
> *   실제 사용 시 대학의 정보 보안 지침 및 학사 운영 정책을 반드시 준수해야 합니다.
> *   세션 정보가 포함된 쿠키 파일(`.json`) 유출에 각별히 유의하십시오.
