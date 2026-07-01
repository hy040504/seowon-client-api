/** 기본 서원대 클라이언트 생성 옵션 */
export interface SeowonClientOptions {
  baseUrl?: string; // 요청 기준 e-campus 기본 URL
  fetch?: typeof fetch; // 커스텀 fetch 구현체
}

/** 기본 클라이언트 공통 인터페이스 */
export interface SeowonClient {
  readonly baseUrl: string; // 정규화된 기본 URL
  resolveUrl(path: string): URL; // 상대 경로를 절대 URL로 변환
}
