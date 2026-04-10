path = r'frontend/src/lib/api.ts'
open(path, 'w', encoding='utf-8').write("""import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "https://itsm-production-1027.up.railway.app";
export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
""")
print("OK api.ts")
