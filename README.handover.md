# seowon-client-api 유지보수 요약

## 한줄 요약

서원대학교 e-campus에 로그인하고 과목, 공지, 강의자료, 과제, 이러닝 차시, 영상 URL, 학습 기록 갱신을 처리하는 TypeScript 클라이언트와 CLI 도구 세트입니다.

## 현재 공개 저장소 기준

- 라이선스: MIT (`LICENSE`, `package.json`)
- 런타임: Node.js 20+
- 패키지 타입: ESM (`"type": "module"`)
- 테스트 폴더: 개인정보/fixture 노출 방지를 위해 `test/`는 `.gitignore`에 등록되어 원격 추적에서 제외됨
- 민감 파일 ignore: `.env`, 쿠키/세션 JSON, `files/`, `downloads/`, `*.saz`, `*.mp4`

## 빠른 시작

1. `npm install`
2. `.env.example`을 참고해 `.env` 작성
3. 개별 기능 확인: `npm run prompt:client`
4. 대량 작업 실행: `npm run auto:manager`

```env
SEOWON_ID=your_id
SEOWON_PASSWORD=your_password
DOWNLOAD_HIGH_WATER_MARK=1024
```

## CLI 도구 구분

| 도구            | 명령어                  | 역할                                      |
| :-------------- | :---------------------- | :---------------------------------------- |
| `prompt-client` | `npm run prompt:client` | 개별 API 응답과 파싱 결과 확인           |
| `auto-manager`  | `npm run auto:manager`  | 일괄 다운로드, 순차 자동 시청, 과제 조사 |

`prompt-client` 메뉴명 기준:

- `4. 강의실자료 (materials)`: 강의자료실만 조회
- `5. 과제 (assignments)`: 과제 목록과 제출 상태 조회
- `6. 통합 검색(공지/강의자료/과제) (classroom-resources)`: 공지, 강의자료, 과제를 한 번에 조회

## 핵심 모듈

- `src/ecampus/login.ts`: `EcampusClient`, 인증, 세션, API 호출 래퍼
- `src/ecampus/crypto.ts`: e-campus 로그인용 `encryptData` 생성
- `src/ecampus/cookies.ts`: 쿠키 저장/복원 및 유효성 검사
- `src/ecampus/courses.ts`: 과목 목록 파싱
- `src/ecampus/classroom.ts`: 공지/강의자료/과제 파싱 및 통합 리소스 구조
- `src/ecampus/elearning.ts`: 이러닝 차시 파싱, 영상 URL 분석, 다운로드, 학습 세션
- `src/cli-ui.ts`: CLI 메뉴, 색상, 진행바, 공통 입력 유틸리티

## 유지보수 주의사항

- 실제 계정 정보, 쿠키, 세션, SAZ, HTML 캡처 파일은 커밋하지 않습니다.
- `test/`는 로컬 검증용으로만 유지됩니다. 공개 저장소에 다시 올릴 경우 fixture 익명화가 먼저 필요합니다.
- `prompt-client.js`는 JS 파일이므로 TypeScript 타입 표기를 넣지 않습니다.
- TypeScript 직접 실행은 npm script를 사용합니다. 로더 설정이 포함되어 있습니다.

## 자주 쓰는 명령어

```bash
npm run format:check
npm run prompt:client
npm run auto:manager
npm run build
```
