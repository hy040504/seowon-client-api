# seowon-client-api

서원대학교 e-campus(LMS) 연동을 위한 엔터프라이즈급 TypeScript 클라이언트 라이브러리 및 CLI 도구입니다.

## 💎 코드 품질 및 설계 원칙

- **Senior Engineer Standard**: 모든 코드는 "Senior Software Engineer" 가이드라인을 준수합니다.
- **WHY-centric Documentation**: 단순한 동작 설명이 아닌, 설계 의도와 비즈니스 로직의 배경을 설명하는 전문적인 주석 체계를 갖추고 있습니다.
- **Full JSDoc Support**: 모든 API와 함수에 대해 상세한 한국어 JSDoc 명세를 제공하여 개발자 경험(DX)을 극대화했습니다.
- **Robust Parsing**: 다양한 서버 응답 및 예외 상황에 대응하는 유연하고 견고한 데이터 추출 로직을 포함합니다.

## 🚀 핵심 기능

1. **정밀 학습 자동화 (ElearningSession)**
   - 실제 사용자 패킷 시퀀스를 완벽히 재현한 6단계 인증 흐름.
   - 45~75초 가변 랜덤 딜레이 적용으로 안정성 확보.
   - 실시간 학습 진행률(%) 동기화 및 마일스톤 알림.
2. **지능형 미디어 분석**
   - 다중 추출 전략(Regex, Base64 Fallback)을 통한 고해상도 MP4 주소 도출.
   - 대용량 영상의 안정적인 스트리밍 다운로드 지원.
3. **통합 강의실 인터페이스**
   - 수강 과목, 공지사항, 과제, 강의자료의 원스톱 조회 및 파싱.

## 🛠 기술 스택

- **언어**: TypeScript (Strict Mode)
- **통신**: Axios, tough-cookie (CookieJar Management)
- **파싱**: Cheerio (High-speed Scraping)
- **도구**: Readline (Advanced CLI Control)

## 📦 설치 및 사용법

1. **의존성 설치**
   ```bash
   npm install
   ```
2. **환경 설정**
   `.env` 파일에 `SEOWON_ID`, `SEOWON_PASSWORD`를 설정합니다.
3. **CLI 실행**
   ```bash
   node prompt-client.js
   ```

## 🖥 CLI 전문가 명령어

- **status**: 학습 세션 중 실시간 진행률 즉시 확인.
- **clear**: 터미널 화면 정리 및 입력 가독성 확보.
- **stop**: 안전한 종료 패킷(`exitStudy`) 전송 및 세션 정리.

## ⚠️ 주의사항

- 본 도구는 연구 및 교육용으로 제작되었습니다.
- 사용 시 해당 대학의 정보 보안 및 학사 운영 정책을 반드시 준수해야 합니다.
- 세션 쿠키 정보가 포함된 파일 유출에 주의하십시오.
