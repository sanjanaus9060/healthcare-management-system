import axios from "axios";

export const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const TOKEN_KEY = "hc_token";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !url.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login?expired=1";
    }
    return Promise.reject(err);
  }
);

export function formatDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg.replace(/^Value error, /, "") : JSON.stringify(e)))
      .join(" ");
  }
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function formatError(err) {
  if (!err.response) return "Unable to reach the server. Check your connection and try again.";
  return formatDetail(err.response.data?.detail);
}
