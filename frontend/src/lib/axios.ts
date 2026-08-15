import axios from "axios";
import { getAuth } from "@/lib/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  // 10s timeout — prevents a slow backend from hanging the UI indefinitely.
  // Shows an error state instead so the user knows something went wrong.
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const auth = getAuth();
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const isUnauthorized = error.response.status === 401;
      const isUserDeleted = error.response.status === 404 && error.config?.url?.includes('/auth/user/me');

      if (isUnauthorized || isUserDeleted) {
        // Token is invalid/expired or user was deleted
        if (typeof window !== "undefined" && !window.location.pathname.includes('/login')) {
          localStorage.removeItem("campus_food_auth");
          sessionStorage.removeItem("campus_food_auth");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);


export default api;
