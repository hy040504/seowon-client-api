import { describe, expect, it } from "vitest";
import {
  parseEcampusMaterialListFromSaz,
  stringifyEcampusClassroomItems
} from "../src/index";
import { readLogicCircuitSaz } from "./ecampus-classroom-fixture";

describe("논리회로 강의자료실 목록", () => {
  it("강의자료실 목록 JSON을 만든다", () => {
    const materials = parseEcampusMaterialListFromSaz(readLogicCircuitSaz());
    const json = stringifyEcampusClassroomItems(materials);

    console.log("강의자료실 JSON:", json);

    expect(materials).toHaveLength(8);
    expect(materials[0]).toMatchObject({
      id: "ATCL_260511T144458_33d02b9",
      request: {
        method: "POST",
        url: "https://ecampus.seowon.ac.kr/bbs/bbsLect/Form/viewAtclForm",
        body: {
          bbsId: "BBS_2026_1_736078_01_P",
          atclId: "ATCL_260511T144458_33d02b9",
          crsCreCd: "2026_1_736078_01"
        }
      }
    });
  });
});
