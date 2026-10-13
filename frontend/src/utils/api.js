const API = (window.KEYLINE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "keyline_access_token";
const getToken = () => sessionStorage.getItem(TOKEN_KEY);
const authHeaders = (token = getToken()) => token ? { Authorization: `Bearer ${token}` } : {};
const go = (path) => window.location.assign(path);
const readableError = (value, fallback) => {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const firstMessage = value.map((item) => readableError(item, "")).find(Boolean);
    return firstMessage || fallback;
  }
  if (value && typeof value === "object") {
    for (const key of ["message", "msg", "detail", "error"]) {
      const message = readableError(value[key], "");
      if (message) return message;
    }
  }
  return fallback;
};
const errorDetail = async (response, fallback) => {
  const body = await response.json().catch(() => ({}));
  return readableError(body.detail, readableError(body.message, fallback));
};

export { API, TOKEN_KEY, getToken, authHeaders, go, readableError, errorDetail };
