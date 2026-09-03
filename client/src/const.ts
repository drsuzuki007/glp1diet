export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Start Google sign-in.
 *
 * Call it from an event handler at the moment you want to navigate, e.g.
 * `onClick={() => startLogin()}` — never during render.
 *
 * The Worker owns the whole OAuth handshake now: `/api/oauth/login` mints the
 * one-time CSRF nonce, sets its cookie and redirects to Google, and
 * `/api/oauth/callback` sets the session cookie and sends the browser back to
 * `returnTo`. The client no longer needs an app id or a portal URL.
 */
export const startLogin = (returnTo?: string) => {
  const target = returnTo ?? `${window.location.pathname}${window.location.search}`;

  // App.tsx also restores this after the redirect, which covers the case where
  // the callback lands on "/" (e.g. an expired state cookie).
  try {
    window.sessionStorage.setItem("medivista_post_login_path", target);
  } catch {
    // sessionStorage unavailable (private mode); the server redirect still works.
  }

  const url = new URL("/api/oauth/login", window.location.origin);
  url.searchParams.set("returnTo", target);
  window.location.href = url.toString();
};
