import { describe, expect, it } from "vitest";
import { loginRedirectUrl, loginLinkError } from "@/lib/auth-rules";

describe("production email login", () => {
  it("returns email sign-ins to the deployed ClaimBack login page", () => {
    expect(loginRedirectUrl()).toBe("https://claimback-india.vercel.app/login");
  });
  it("accepts an explicitly configured HTTPS login destination", () => {
    expect(loginRedirectUrl("https://login.example.org/login")).toBe("https://login.example.org/login");
  });
  it("rejects insecure or malformed login destinations", () => {
    for (const value of ["http://example.org/login", "javascript:alert(1)", "not a URL", "https://user:password@example.org/login", "https://example.org/login#token"]) {
      expect(loginRedirectUrl(value)).toBe("https://claimback-india.vercel.app/login");
    }
  });
  it("recognizes an expired link without reflecting its contents", () => {
    expect(loginLinkError("#error=access_denied&error_code=otp_expired&error_description=untrusted")).toBe("This sign-in link is invalid or has expired. Request a new link and use the most recent email.");
    expect(loginLinkError("#access_token=example&type=magiclink")).toBe("");
  });
});