import { describe, expect, it } from "vitest";
import { parseEcampusNoticeListFromSaz, stringifyEcampusClassroomItems } from "../src/index";
import { readLogicCircuitSaz } from "./ecampus-classroom-fixture";

describe("논리회로 공지사항 목록", () => {
  it("공지사항 목록 JSON을 만든다", () => {
    const notices = parseEcampusNoticeListFromSaz(readLogicCircuitSaz());
    const json = stringifyEcampusClassroomItems(notices);

    console.log("공지사항 JSON:", json);

    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      id: "ATCL_260227T191603_351003f",
      request: {
        method: "POST",
        url: "https://ecampus.seowon.ac.kr/bbs/bbsLect/Form/viewAtclForm",
        body: {
          bbsId: "BBS_2026_1_736078_01_N",
          atclId: "ATCL_260227T191603_351003f",
          crsCreCd: "2026_1_736078_01"
        }
      }
    });
  });
});
