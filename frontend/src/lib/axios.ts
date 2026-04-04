import axios from "axios";
import { getAuth } from "@/lib/auth";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
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
    if (error.response && error.response.status === 401) {
      // Token is invalid/expired or user was deleted
      if (typeof window !== "undefined" && !window.location.pathname.includes('/login')) {
        localStorage.removeItem("campus_food_auth");
        sessionStorage.removeItem("campus_food_auth");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
