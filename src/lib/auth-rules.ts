export const LOGIN_REDIRECT_URL = "https://claimback-india.vercel.app/login";

export function loginLinkError(hash: string): string {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.has("error") && !params.has("error_code")) return "";
  return "This sign-in link is invalid or has expired. Request a new link and use the most recent email.";
}