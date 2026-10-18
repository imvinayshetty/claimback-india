import { describe, expect, it } from "vitest";
import { LOGIN_REDIRECT_URL, loginLinkError } from "@/lib/auth-rules";

describe("production email login", () => {
  it("returns email sign-ins to the deployed ClaimBack login page", () => {
    expect(LOGIN_REDIRECT_URL).toBe("https://claimback-india.vercel.app/login");
  });
  it("recognizes an expired link without reflecting its contents", () => {
    expect(loginLinkError("#error=access_denied&error_code=otp_expired&error_description=untrusted")).toBe("This sign-in link is invalid or has expired. Request a new link and use the most recent email.");
    expect(loginLinkError("#access_token=example&type=magiclink")).toBe("");
  });
});