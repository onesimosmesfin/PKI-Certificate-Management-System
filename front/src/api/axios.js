import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { decodeJWT } from "../utils/jwt";

// XAMPP's Apache commonly occupies port 8080 during local development.
// The Spring Boot API therefore runs on 8081 by default.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

const AUTH_PATHS = ["/auth/login", "/auth/signup", "/auth/refresh"];

const isAuthPath = (url = "") => AUTH_PATHS.some((path) => url.includes(path));

const isTokenExpired = (token) => {
  const decoded = decodeJWT(token);

  if (!decoded?.exp) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return decoded.exp <= nowInSeconds + 15;
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const authApi = axios.create({
  baseURL: API_BASE_URL,
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const store = useAuthStore.getState();
      const refreshToken = store.refreshToken;

      if (!refreshToken) {
        throw new Error("Missing refresh token");
      }

      const refreshResponse = await authApi.post("/auth/refresh", {
        refreshToken,
      });

      const {
        accessToken,
        refreshToken: nextRefreshToken,
      } = refreshResponse.data || {};

      if (!accessToken) {
        throw new Error("No access token returned");
      }

      store.setTokens({
        accessToken,
        refreshToken: nextRefreshToken ?? refreshToken,
      });

      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

api.interceptors.request.use(async (config) => {
  if (isAuthPath(config.url)) {
    return config;
  }

  let token = useAuthStore.getState().accessToken;

  if (token && isTokenExpired(token)) {
    try {
      token = await refreshAccessToken();
    } catch (refreshError) {
      console.error("Pre-request token refresh failed:", refreshError);
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    }
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;

    if (!original || isAuthPath(original.url)) {
      return Promise.reject(error);
    }

    if ((error.response?.status === 401 || error.response?.status === 403) && !original._retry) {
      original._retry = true;

      try {
        const accessToken = await refreshAccessToken();

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;

        return api(original);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
