import axios from "axios";
import store from "../Redux/reduxStore";
import { logout, setAccessToken } from "../Redux/userSlice";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = store.getState().user.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401, same pattern the original spec called for.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = store.getState().user.refreshToken;
      if (!refreshToken) {
        store.dispatch(logout());
        return Promise.reject(error);
      }
      refreshing = refreshing || axios.post("/api/auth/refresh", { refresh: refreshToken });
      try {
        const { data } = await refreshing;
        store.dispatch(setAccessToken(data.access));
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        store.dispatch(logout());
      } finally {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
