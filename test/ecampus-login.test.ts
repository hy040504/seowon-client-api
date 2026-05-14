import { describe, expect, it } from "vitest";
import { createLoginEncryptData, parseLoginResponse } from "../src/index";

describe("parseLoginResponse", () => {
  it("redirectUrl이 없으면 로그인 실패로 처리한다", () => {
    expect(parseLoginResponse({})).toMatchObject({
      type: "error",
      message: "아이디 또는 비밀번호가 맞지 않습니다."
    });
  });

  it("학습자 OTP 응답이면 redirect URL을 만든다", () => {
    const result = parseLoginResponse({
      redirectUrl: "/otp",
      otpLogin: "Y",
      otpUserYn: "Y",
      otpUserType: "CLASS_LEARNER",
      userId: "student",
      userNo: "1"
    });

    expect(result).toMatchObject({
      type: "redirect",
      url: "https://ecampus.seowon.ac.kr/otp?userId=student&userNo=1"
    });
  });
});

describe("createLoginEncryptData", () => {
  it("로그인용 encryptData 문자열을 생성한다", () => {
    const encryptData = createLoginEncryptData("student", "password");

    expect(encryptData.length).toBeGreaterThan(0);
    expect(encryptData).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
