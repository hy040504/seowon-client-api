/** 기본 서원대 클라이언트 생성 옵션 */
export interface SeowonClientOptions {
  /** 요청 기준 e-campus 기본 URL */
  baseUrl?: string;
  /** 테스트나 서버 런타임에서 주입할 커스텀 fetch 구현체 */
  fetch?: typeof fetch;
}

/** 기본 클라이언트 공통 인터페이스 */
export interface SeowonClient {
  /** 정규화된 기본 URL */
  readonly baseUrl: string;
  /**
   * 상대 경로를 기본 URL 기준의 절대 URL로 변환한다.
   * @param {string} path - 변환할 상대 경로 또는 절대 URL
   * @returns {URL} 기준 URL이 적용된 URL 객체
   */
  resolveUrl(path: string): URL;
}
