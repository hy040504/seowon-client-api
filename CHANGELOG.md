# Changelog

## Unreleased

- 수강희망바구니(예비 담기) 모듈을 `src/hope-basket/` 로 분리했습니다. **정식 수강신청 본신청은 미포함.**
  - 공개 클라이언트: `HopeBasketClient` / `createHopeBasketClient`
  - CLI: `npm run hope-basket:manager`, prompt 명령 `hope-basket-*`
  - 네트워크 재시도/타임아웃/진행 로그 적용

## 1.0.0

- 초기 패키지 구조를 설정했습니다.
