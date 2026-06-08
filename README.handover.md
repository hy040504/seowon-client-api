# seowon-client-api 유지보수 요약

## 한줄 요약

서원대학교 e-campus에 로그인하고 과목, 공지, 강의자료, 과제, 이러닝 차시, 영상 URL, 학습 기록 갱신을 처리하는 TypeScript 클라이언트와 CLI 도구 세트입니다.

## 현재 공개 저장소 기준

- 라이선스: MIT (`LICENSE`, `package.json`)
- 런타임: Node.js 20+
- 패키지 타입: ESM (`"type": "module"`)
- 테스트 폴더: 개인정보/fixture 노출 방지를 위해 `test/`는 `.gitignore`에 등록되어 원격 추적에서 제외됨
- 민감 파일 ignore: `.env`, 쿠키/세션 JSON, `files/`, `downloads/`, `*.saz`, `*.mp4`, `tmp-sample-material-detail*.html` (로컬 강의자료 상세 샘플)

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

- `4. 강의실자료 (materials)`: 강의자료실만 조회 (list + request 객체 포함)
- `5. 과제 (assignments)`: 과제 목록과 제출 상태 조회
- `6. 통합 검색(공지/강의자료/과제) (classroom-resources)`: 공지, 강의자료, 과제를 한 번에 조회

`auto-manager` 최근 메뉴:
- 8. 강의자료 다운로드 (일괄 + 첨부 분석/미리보기)
  - 이전 8번 일괄 다운로드와 9번 상세 분석 기능이 하나로 통합됨.
  - 선택한 강의자료의 첨부파일을 `request` 객체로 먼저 분석하고, 첨부가 있는 항목만 다운로드 큐에 넣음.

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

## 최근 분석 (2026-06): 강의자료(materials) 상세 조회 + Live Capture

- 목록(JSON)의 각 항목에 포함된 `request` 객체를 사용해 상세 fragment를 가져올 수 있음.
  - 현재 `request.url`은 shell을 반환하는 `viewAtclForm`이 아니라 실제 본문/첨부 fragment를 반환하는 `/bbs/bbsLect/viewAtcl`.
  - `request.body`에는 `formType: "VIEW"`, `bbsId`, `atclId`, `bbsCd`, `crsCreCd`가 포함됨.
- `EcampusClient.getMaterialAttachments()`가 내부에서 `fetchClassroomDetailHtml` + `parseEcampusClassroomAttachmentsHtml` 조합으로 첨부 추출.
- SAZ 패킷 헤더 분석으로 요청 개선:
  - navigation 스타일 헤더 (sec-ch-ua*, Sec-Fetch-Mode: navigate, full Accept, no X-Requested-With) 적용.
  - Referer 등 실제 캡처와 유사하게 조정.
- 중요 발견: viewAtclForm POST 응답은 주로 shell (hidden atclId + #bbsAtclView + JS)만 반환.
  - 실제 제목/본문/첨부는 JS가 후속으로 `/bbs/bbsLect/viewAtcl` 또는 `/bbs/bbsLect/atclList` 등을 호출해 동적 로드.
  - 따라서 단일 POST + parser로는 attachments가 0으로 나오는 경우가 일반적 (샘플 확인).
- 로컬 샘플: tmp-sample-material-detail-another.html (다른 과목의 실시간 강의자료 상세, hasAttachment=true).
  - 이전 샘플은 정리됨.

**2026-06-05 Live Capture (scripts/capture-live.mjs) 분석 결과 (사용자 직접 브라우저 작업):**

- `npm run capture:live` 로 visible Chrome + DevTools 열고, 실제 로그인→강의자료 클릭→다운로드까지 수행 → captures/live/<ts>_<slug>/ 에 request/response/body/page 자동 저장.
- /atclList fragment HTML 구조: li.onclick="viewAtcl('ATCL_..', null, ..)" + 내부 a>span+paperclip (기존 a[href^=js:viewAtcl] selector 미매치).
- 상세: Form/viewAtclForm = shell, **/bbs/bbsLect/viewAtcl POST (formType=VIEW + bbsCd + ids) = 실제 post_view fragment** (title, ul.viewInfo.file > a[href="javascript:fileDown('TOKEN')"] + paperclip + filename).
- 다운로드: /file/download/<token> GET, cd: attachment + filename + filename*=UTF-8''...
- parser/classroom.ts, login.ts, auto-manager.ts, tests, docs/api-responses 수정 완료:
  - parseBbsListHtml 가 두 HTML 스타일 지원 + bbsId 옵션 + 올바른 /viewAtcl request 생성.
  - fileDown('TOKEN') → /file/download/TOKEN URL 추출 지원.
  - getMaterialList 후 getMaterialAttachments 로 실제 첨부 URL + 다운로드 동작 확인.
  - auto-manager 메뉴 8에서 첨부 미리 분석/미리보기와 일괄 다운로드를 통합.
- captures/live 결과물은 향후 parser regression test fixture 로도 사용 가능. (gitignore 권장)

- prompt-client로 목록 확인 → auto-manager 메뉴 8로 request 기반 첨부 분석/다운로드 연계 추천.
- SAZ: files/e러닝-expanded/sessions/*.md 에서 실제 Request Headers 참고 (analyze-saz.mjs로 언패킹).

**완료 상태 (2026-06-05)**: 
"자 이제 분석해" 요청에 따라 live capture 전체 분석 → 파서/요청 로직 수정 → capture tool 강화 → 문서 갱신까지 한 사이클 완료. 
상세 내용은 handover.txt [13] 섹션 참조. 
주요 성과: request 객체가 이제 실제 /viewAtcl + fileDown 기반 첨부 URL을 올바르게 가리키게 됨.

## 자주 쓰는 명령어

```bash
npm run format:check
npm run prompt:client
npm run auto:manager
npm run build
```
