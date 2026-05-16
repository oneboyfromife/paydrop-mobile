import { getDeviceId } from "@/lib/deviceId";
import axios from "axios";
import { useUserStore } from "../store/userStore";
import { showToast } from "@/utils/toast";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "https://pay-drop-backend.vercel.app/api/v1",
});

// For queuing failed requests while refreshing
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  async (config) => {
    const deviceId = await getDeviceId();
    const accessToken = useUserStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add logging to debug 404
    console.log(
      `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );

    config.headers["x-device-id"] = deviceId;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, logout, setTokens } = useUserStore.getState();

      if (!refreshToken) {
        isRefreshing = false;
        logout();
        showToast.error("Session Expired", "Please login again to continue.");
        return Promise.reject(error);
      }

      try {
        // Use a clean axios instance or direct call to avoid interceptor loop for refresh
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              "x-device-id": await getDeviceId(),
            },
          },
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data;

        setTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        showToast.error("Session Expired", "Please login again to continue.");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
