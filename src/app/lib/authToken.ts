const ACCESS_TOKEN_KEY = "ora_access_token";

export function getAccessToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY) || "";
  } catch (_error) {
    return "";
  }
}

export function setAccessToken(token: string) {
  try {
    if (!token) {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      return;
    }
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (_error) {
    // noop
  }
}

export function clearAccessToken() {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (_error) {
    // noop
  }
}
