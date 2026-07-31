# 구조

`seowon-client-api`는 작은 TypeScript 패키지 구조로 구성합니다.

- `src/`: 외부로 공개할 패키지 소스 코드
- `test/`: Vitest 기반 테스트
- `examples/`: 실행 가능한 사용 예시
- `docs/`: 프로젝트 메모와 API 설계 결정 기록
- `files/`: 패키지 코드가 아닌 참고용 HTML, 실험 파일, 원본 캡처

패키지는 먼저 클라이언트 팩토리를 공개합니다. 이후 고수준 모듈은 서비스 URL을 여기저기에서 직접 호출하지 않고, 이 클라이언트를 기반으로 확장합니다.

SAZ 파일 자체와 원본 캡처는 `files/`에 두지만, SAZ를 여는 코드와 e-campus용 `parse...FromSaz()` 진입점은 `src/ecampus/saz.ts`에 둡니다. `classroom.ts`, `elearning.ts`, `score.ts`는 HTML/JSON 응답 파싱과 요청 생성만 담당합니다.

## 희망바구니 vs 정식 수강신청

| 구분 | 상태 | 모듈/CLI |
| --- | --- | --- |
| 수강희망바구니 (예비 담기) | 구현됨 | `src/hope-basket/`, `hope-basket-manager` |
| 정식 수강신청 (본신청 등록/정정) | 미구현 | 추후 별도 모듈로 추가 예정 |

희망바구니는 e-campus와 다른 호스트(`sugangh.seowon.ac.kr`)와 Nexacro SSV 프로토콜을 사용하므로 `src/hope-basket/`에 분리합니다.  
같은 호스트라도 **정식 수강신청 본신청**은 일정 코드/신청 종류 코드가 다르므로 이후 모듈을 나눕니다.

- `types/ssv.ts`, `types/basket.ts`: 인터페이스/타입만 정의
- `constants.ts`: 호스트, 메뉴, API 경로 상수 (`appcsKindCd=100` 등 희망바구니 전용 값)
- `ssv.ts`: SSV 인코딩/디코딩
- `basket.ts`: 요청 생성·응답 정규화
- `saz.ts`: SAZ 복원 (`parseSugangBasketFromSaz`)
- `client.ts`: `HopeBasketClient` 세션/쿠키 라이프사이클

`prompt-client`는 개별 API 응답 확인용입니다. e-campus 반복 작업은 `auto-manager`, 희망바구니는 `hope-basket-manager`로 분리합니다.
