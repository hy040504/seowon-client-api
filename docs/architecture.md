# 구조

`seowon-client-api`는 작은 TypeScript 패키지 구조로 구성합니다.

- `src/`: 외부로 공개할 패키지 소스 코드
- `test/`: Vitest 기반 테스트
- `examples/`: 실행 가능한 사용 예시
- `docs/`: 프로젝트 메모와 API 설계 결정 기록
- `files/`: 패키지 코드가 아닌 참고용 HTML, 실험 파일, 원본 캡처

패키지는 먼저 클라이언트 팩토리를 공개합니다. 이후 고수준 모듈은 서비스 URL을 여기저기에서 직접 호출하지 않고, 이 클라이언트를 기반으로 확장합니다.

SAZ 파일 자체와 원본 캡처는 `files/`에 두지만, SAZ를 여는 코드와 `parse...FromSaz()` 진입점은 `src/ecampus/saz.ts`에 둡니다. `classroom.ts`, `elearning.ts`, `score.ts`는 HTML/JSON 응답 파싱과 요청 생성만 담당합니다.
