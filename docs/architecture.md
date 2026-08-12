# 구조

`seowon-client-api`는 작은 TypeScript 패키지 구조로 구성합니다.

- `src/`: 외부로 공개할 패키지 소스 코드
- `cli/`: 인터랙티브 CLI 진입점 (auto-manager, hope-basket, 본신청, prompt-client)
- `test/`: Vitest 기반 테스트
- `examples/`: 실행 가능한 사용 예시
- `docs/`: 프로젝트 메모, API 샘플, 프롬프트, 피드백 분석
- `research/saz/`: Fiddler SAZ 패킷·확장 분석 원본 (로컬 참고)
- `scripts/`: 빌드·캡처·SAZ 분석 보조 스크립트
- `data/`, `output/`, `captures/`, `downloads/`: 런타임 생성물 (gitignore 대상 다수)

패키지는 먼저 클라이언트 팩토리를 공개합니다. 이후 고수준 모듈은 서비스 URL을 여기저기에서 직접 호출하지 않고, 이 클라이언트를 기반으로 확장합니다.

SAZ 파일 자체와 원본 캡처는 `research/saz/`(및 필요 시 `files/`)에 두지만, SAZ를 여는 코드와 e-campus용 `parse...FromSaz()` 진입점은 `src/ecampus/saz.ts`에 둡니다. `classroom.ts`, `elearning.ts`, `score.ts`는 HTML/JSON 응답 파싱과 요청 생성만 담당합니다.

## 희망바구니 vs 정식 수강신청

| 구분                             | 상태   | 모듈/CLI                                              |
| -------------------------------- | ------ | ----------------------------------------------------- |
| 수강희망바구니 (예비 담기)       | 구현됨 | `src/hope-basket/`, `cli/hope-basket-manager.ts`      |
| 정식 수강신청 (본신청 등록/정정) | 구현됨 | `src/course-registration/`, `cli/course-registration-manager.ts` |

희망바구니는 e-campus와 다른 호스트(`sugangh.seowon.ac.kr`)와 Nexacro SSV 프로토콜을 사용하므로 `src/hope-basket/`에 분리합니다.  
같은 호스트라도 **정식 수강신청 본신청**은 menuId·API 경로·쿠키 파일이 다르므로 `src/course-registration/`에 분리합니다.

- `types/ssv.ts`, `types/basket.ts`: 인터페이스/타입만 정의
- `constants.ts`: 호스트, 메뉴, API 경로 상수 (`appcsKindCd=100` 등 희망바구니 전용 값)
- `ssv.ts`: SSV 인코딩/디코딩
- `basket.ts`: 요청 생성·응답 정규화
- `saz.ts`: SAZ 복원 (`parseSugangBasketFromSaz`)
- `client.ts`: `HopeBasketClient` 세션/쿠키 라이프사이클

`cli/prompt-client.js`는 개별 API 응답 확인용입니다. e-campus 반복 작업은 `cli/auto-manager.ts`, 희망바구니는 `cli/hope-basket-manager.ts`, 본신청은 `cli/course-registration-manager.ts`로 분리합니다.
