import { describe, expect, it } from "vitest";
import { parseEcampusAssignmentListFromSaz, stringifyEcampusClassroomItems } from "../src/index";
import { readLogicCircuitSaz } from "./ecampus-classroom-fixture";

describe("논리회로 과제 목록", () => {
  it("과제 목록 JSON을 만든다", () => {
    const assignments = parseEcampusAssignmentListFromSaz(readLogicCircuitSaz());
    const json = stringifyEcampusClassroomItems(assignments);

    console.log("과제 JSON:", json);

    expect(assignments).toHaveLength(8);
    expect(assignments[0]).toMatchObject({
      id: "ASMNT_260507T125246_87067da",
      request: {
        method: "POST",
        url: "https://ecampus.seowon.ac.kr/asmnt/asmntLect/Form/asmntStuMain",
        body: {
          asmntCd: "ASMNT_260507T125246_87067da",
          crsCreCd: "2026_1_736078_01"
        }
      }
    });
  });
});
