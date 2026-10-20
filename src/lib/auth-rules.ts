export function loginRedirectUrl(configured?: string): string {
  const fallback = "https://claimback-india.vercel.app/login";
  if (!configured?.trim()) return fallback;
  try {
    const url = new URL(configured.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search) return fallback;
    return url.href;
  } catch { return fallback; }
}

export const LOGIN_REDIRECT_URL = loginRedirectUrl(import.meta.env['VITE_LOGIN_REDIRECT_URL']);

export function loginLinkError(hash: string): string {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.has("error") && !params.has("error_code")) return "";
  return "This sign-in link is invalid or has expired. Request a new link and use the most recent email.";
}