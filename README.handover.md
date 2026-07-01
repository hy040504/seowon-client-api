# seowon-client-api 유지보수 요약

## 현재 기준

- 최종 문서 갱신: 2026-07-01
- 라이선스: MIT
- 런타임: Node.js 20+
- 패키지 타입: ESM (`"type": "module"`)
- 주요 CLI: `npm run prompt:client`, `npm run auto:manager`
- 상세 인수인계: `handover.txt`

## 프로젝트 요약

서원대학교 e-campus에 로그인하고 과목, 공지, 강의자료, 과제, 이러닝 차시, 영상 URL, 학습 기록, 성적 요약을 다루는 비공식 TypeScript 클라이언트와 CLI 도구 모음입니다.

공식 SDK가 아니며 실제 계정 정보, 쿠키, 세션, LMS HTML/SAZ 캡처, 다운로드 파일은 공개 저장소에 포함하지 않습니다.

## 빠른 시작

1. `npm install`
2. `.env.example`을 참고해 `.env` 작성
3. 개별 기능 확인: `npm run prompt:client`
4. 반복 작업 실행: `npm run auto:manager`

```env
SEOWON_ID=your_id
SEOWON_PASSWORD=your_password
DOWNLOAD_HIGH_WATER_MARK=1024
```

## auto-manager 메뉴

```text
1. 로그인 / 로그인 정보 갱신
2. 이러닝 일괄 다운로드 (전체 대기열 시각화)
3. 이러닝 순차 자동 시청 (고급 로그 제어)
4. 전체 교과목 미제출 과제 전수 조사
5. 전 과목 기간 내 미완료 이러닝 자동 시청
6. 현재 수행 가능한 전 과목 미제출 과제 목록
7. 현재 수행 가능한 과제 선택 및 상세내용 보기
8. 강의자료 다운로드 (일괄 + 첨부 분석/미리보기)
9. 교과 과목 전체 성적(등급) 조회
0. 종료
```

## 핵심 모듈

- `src/ecampus/login.ts`: `EcampusClient`, 로그인, 세션, HTTP 요청, 기능별 메서드 연결
- `src/ecampus/cookies.ts`: 쿠키 저장/복원/유효성 확인
- `src/ecampus/crypto.ts`: e-campus 로그인용 `encryptData` 생성
- `src/ecampus/courses.ts`: 과목 목록과 교과/비교과 그룹 파싱
- `src/ecampus/classroom.ts`: 공지/강의자료/과제 파싱, 첨부 URL 추출
- `src/ecampus/elearning.ts`: 이러닝 차시 파싱, MP4 분석, 다운로드, 학습 세션
- `src/ecampus/score.ts`: 성적 공개/설문/페이지/요약 파싱
- `src/ecampus/saz.ts`: Fiddler SAZ 세션 복원과 SAZ 기반 파서
- `src/ecampus/types/`: 기능별 공개 타입
- `src/types/auto-manager.ts`: auto-manager 전용 타입

## 최근 주요 변경 포인트

- 성적 조회 기능이 추가되었습니다.
  - `scoreOpenJson`으로 공개 여부와 설문 게이트를 확인합니다.
  - `classRoomMainForm`으로 강의실 컨텍스트를 만든 뒤 `viewStdScore`에서 `stdNo`를 추출합니다.
  - `/crs/scoreHome/viewStdScoreSumm` fragment에서 항목별 점수, 총점, 등급을 파싱합니다.
  - auto-manager 메뉴 9에서 교과 과목 전체 성적 등급을 순회 조회합니다.

- SAZ 분석 진입점이 확장되었습니다.
  - `parseFiddlerSazSessions`
  - `parseEcampusScoreOpenInfoFromSaz`
  - `parseEcampusScoreSurveyInfoFromSaz`
  - `parseEcampusScorePageFromSaz`
  - `parseEcampusScoreSummariesFromSaz`

- 강의자료 다운로드 흐름이 request 객체 기반으로 정리되었습니다.
  - 목록 항목의 request에서 실제 `/bbs/bbsLect/viewAtcl` fragment를 조회합니다.
  - `fileDown('TOKEN')`과 `/file/download/TOKEN`을 모두 첨부 URL로 처리합니다.

- auto-manager UX가 정리되었습니다.
  - 이러닝/과제 제목에 `[n 주차]` 표기를 가능한 범위에서 정규화합니다.
  - 이러닝 자동 시청은 TTY에서 3줄 고정 상태 영역을 사용합니다.
  - 여러 항목 선택은 쉼표와 범위를 지원합니다.

## 검증 상태

2026-07-01 기준 최근 확인:

```bash
npm run typecheck
npx tsc --ignoreConfig --noEmit --target es2022 --module nodenext --moduleResolution nodenext --esModuleInterop --skipLibCheck auto-manager.ts
npx vitest run test/ecampus-score.test.ts
npm run build
npx prettier --check auto-manager.ts src/types/auto-manager.ts README.md
```

`npm test` 전체는 로컬 fixture가 없는 환경에서 일부 실패할 수 있습니다. fixture에는 로그인 메인 HTML, LMS 캡처, SAZ 원본 등 민감 데이터가 포함될 수 있어 기본적으로 공개 저장소에 올리지 않습니다.

## 공개 금지 파일

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
captures/
captures/live/
```

## 자주 쓰는 명령

```bash
npm run prompt:client
npm run auto:manager
npm run analyze:saz
npm run capture:live
npm run format:check
npm run typecheck
npm test
npm run build
```
