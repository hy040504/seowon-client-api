import { describe, expect, it } from "vitest";
import { createSeowonClient } from "../src/index";

describe("createSeowonClient", () => {
  it("uses the eCampus base URL by default", () => {
    const client = createSeowonClient();

    expect(client.baseUrl).toBe("https://ecampus.seowon.ac.kr/");
  });

  it("resolves relative API paths", () => {
    const client = createSeowonClient();

    expect(client.resolveUrl("/lesson/lessonHome/addStudyRecord").toString()).toBe(
      "https://ecampus.seowon.ac.kr/lesson/lessonHome/addStudyRecord"
    );
  });
});
