# Changelog

## Unreleased

### 수강신청 본신청 모듈 추가

- 정식 수강신청(**본신청**) 모듈 `src/course-registration/` 신규 추가
  - 공개 클라이언트: `CourseRegistrationClient` / `createCourseRegistrationClient`
  - CLI: `npm run sugang:registration` (`course-reg:manager` 별칭)
  - 서버: `sugangh.seowon.ac.kr`, **menuId=`M100780` / pgmId=`P001619`**
  - 등록 `saveAppcsDtls.do` · 취소 `saveAppcsDtlsCancl.do` · 내 목록 `findAppcsDtlsList.do`
  - 로그인 시 `appcsKindCd` 미전송 (희망바구니 `appcsKindCd=100` 과 분리)
  - 쿠키: `.seowon-sugang.cookies.json` (희망바구니 쿠키와 별도)
  - 서버 과부하 `flag=0` 허위 로그인 실패 자동 재시도 (`mayBeFalseError`)
  - 등록 전 경고 장학생 체크, 정원 초과 연속 재시도 (`registerCourseWithRetry`)
  - 에러 분류: `CourseRegErrorType` / `classifyCourseRegError` / `formatCourseRegError`
- 단위 테스트 `test/course-registration.test.ts`, 라이브 스모크 `npm run test:course-reg:smoke`
- README에 본신청 지원 범위·API·CLI·혼용 금지 규칙 문서화
- **희망바구니 모듈(`src/hope-basket/`)은 변경하지 않음** — 경로·타입 혼용 금지

### 이전 Unreleased

- 수강희망바구니(예비 담기) 모듈을 `src/hope-basket/` 로 분리했습니다.
  - 공개 클라이언트: `HopeBasketClient` / `createHopeBasketClient`
  - CLI: `npm run hope-basket:manager`, prompt 명령 `hope-basket-*`
  - 네트워크 재시도/타임아웃/진행 로그 적용
- 수강희망바구니 과목 검색 시 한글 과목명이 서버로 정상 전송되도록 파라미터 매핑 버그(`subjtNm` 누락) 수정
- CLI 도구들(`auto-manager`, `hope-basket-manager`, `db-generator/viewer`)에 50건 단위 목록 출력 페이지네이션(더보기) 기능 추가

## 1.0.0

- 초기 패키지 구조를 설정했습니다.
