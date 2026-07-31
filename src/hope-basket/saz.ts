/**
 * 희망바구니 SAZ 복원.
 * 캡처 패킷을 파서 단위 테스트 fixture로 쓰기 위해 세션을 요약한다.
 * 정식 수강신청 본신청 패킷은 여기 포함하지 않는다.
 */

import { parseFiddlerSazSessions, type SazHttpSession } from "../ecampus/saz.js";
import {
  composeSugangLoginResult,
  parseSugangAppcsScheduleListResponse,
  parseSugangBasketMutationResponse,
  parseSugangCultureDomainListResponse,
  parseSugangDepartmentListResponse,
  parseSugangSubjectListResponse,
  parseSugangTermCodeResponse,
  parseSugangTimetableDepartmentListResponse,
  parseSugangTimetableDetailListResponse
} from "./basket.js";
import { SUGANG_PATHS } from "./constants.js";
import { findSsvDataset, parseSsv } from "./ssv.js";
import type { SugangSazBasketSummary } from "./types/basket.js";

/**
 * SAZ에서 희망바구니 관련 세션을 요약한다
 * @param {Buffer | Uint8Array} sazFile - Fiddler SAZ 바이너리
 * @returns {SugangSazBasketSummary} 로그인/검색/담기/취소/시간표 요약
 */
export function parseSugangBasketFromSaz(sazFile: Buffer | Uint8Array): SugangSazBasketSummary {
  const sessions = parseFiddlerSazSessions(sazFile);
  const summary: SugangSazBasketSummary = {
    logins: [],
    subjects: [],
    basketAdds: [],
    basketCancels: [],
    schedules: [],
    departments: [],
    cultureDomains: [],
    timetableDepartments: [],
    timetableSubjects: [],
    termCodes: []
  };

  const loginBodies: string[] = [];
  const studentBodies: string[] = [];
  const loginCheckBodies: string[] = [];

  for (const session of sessions) {
    const path = getSessionPath(session);
    const body = session.response.body;

    if (path.includes(SUGANG_PATHS.findAppcsLogin)) loginBodies.push(body);
    if (path.includes(SUGANG_PATHS.findStunoInfo)) studentBodies.push(body);
    if (path.includes(SUGANG_PATHS.findAppcsLoginChk)) loginCheckBodies.push(body);

    if (path.includes(SUGANG_PATHS.findEstblSubjtShpbsList)) {
      summary.subjects.push(...parseSugangSubjectListResponse(body, "specialty"));
    }
    if (path.includes(SUGANG_PATHS.findEstblSubjtGnrlList)) {
      summary.subjects.push(...parseSugangSubjectListResponse(body, "general"));
    }
    // saveHopeAppcsDtlsCancl 경로가 담기 경로를 부분 문자열로 포함하므로 Cancl을 제외한다
    if (path.includes(SUGANG_PATHS.saveHopeAppcsDtls) && !path.includes("Cancl")) {
      const form = extractMutationIds(session.request.body);
      summary.basketAdds.push(
        parseSugangBasketMutationResponse(body, "add", {
          subjtCd: form.subjtCd,
          corseDvclsNo: form.corseDvclsNo
        })
      );
    }
    if (path.includes(SUGANG_PATHS.saveHopeAppcsDtlsCancl)) {
      const form = extractMutationIds(session.request.body);
      summary.basketCancels.push(
        parseSugangBasketMutationResponse(body, "cancel", {
          subjtCd: form.subjtCd,
          corseDvclsNo: form.corseDvclsNo
        })
      );
    }
    if (path.includes(SUGANG_PATHS.findAppcsSchdlList)) {
      summary.schedules.push(...parseSugangAppcsScheduleListResponse(body));
    }
    if (path.includes(SUGANG_PATHS.findEstblDeprtList)) {
      summary.departments.push(...parseSugangDepartmentListResponse(body));
    }
    if (path.includes(SUGANG_PATHS.findCltrDomnList)) {
      summary.cultureDomains.push(...parseSugangCultureDomainListResponse(body));
    }
    if (path.includes(SUGANG_PATHS.findEstblCorseList)) {
      summary.timetableDepartments.push(...parseSugangTimetableDepartmentListResponse(body));
    }
    if (path.includes(SUGANG_PATHS.findEstblCorseDtlList)) {
      summary.timetableSubjects.push(...parseSugangTimetableDetailListResponse(body));
    }
    if (path.includes(SUGANG_PATHS.findScomUnvfrSchdlInfo)) {
      const term = parseSugangTermCodeResponse(body);
      if (term) summary.termCodes.push(term);
    }
  }

  const count = Math.max(loginBodies.length, studentBodies.length, loginCheckBodies.length);
  for (let i = 0; i < count; i++) {
    const loginBody = loginBodies[i];
    if (!loginBody) continue;
    summary.logins.push(
      composeSugangLoginResult({
        loginBody,
        studentBody: studentBodies[i],
        loginCheckBody: loginCheckBodies[i]
      })
    );
  }

  return summary;
}

/**
 * 세션 URL에서 pathname을 추출한다
 * @param {SazHttpSession} session - SAZ HTTP 세션
 * @returns {string} pathname. 파싱 실패 시 원본 URL
 * @private
 */
function getSessionPath(session: SazHttpSession): string {
  try {
    return new URL(session.request.url).pathname;
  } catch {
    return session.request.url;
  }
}

/**
 * 담기/취소 요청 본문에서 과목 식별자를 읽는다
 * @param {string} body - SSV 요청 본문
 * @returns {{ subjtCd: string; corseDvclsNo: string }} 과목 코드와 분반
 * @private
 */
function extractMutationIds(body: string): { subjtCd: string; corseDvclsNo: string } {
  const doc = parseSsv(body);
  const row = findSsvDataset(doc, "dsParam")?.rows[0];
  return {
    subjtCd: row?.subjtCd ?? "",
    corseDvclsNo: row?.corseDvclsNo ?? ""
  };
}
