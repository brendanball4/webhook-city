// Access token lives in memory only — never localStorage, so an XSS payload
// cannot read it. Durability comes from the httpOnly refresh cookie instead.

let accessToken: string | null = null;
let onSessionEnded: (() => void) | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Registered by AuthProvider so a failed refresh can bounce the user to /login. */
export function setSessionEndedHandler(handler: (() => void) | null) {
  onSessionEnded = handler;
}

export function notifySessionEnded() {
  accessToken = null;
  onSessionEnded?.();
}
