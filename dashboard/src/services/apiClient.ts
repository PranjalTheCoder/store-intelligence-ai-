import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

// 1. Create Singleton Instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 2. Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Example: Inject Authorization header if a token exists in localStorage
    // const token = localStorage.getItem('auth_token');
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error: AxiosError) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  },
);

// 3. Response Interceptor & 4. Error Handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Directly return the data payload to simplify service methods
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;

      if (status === 401) {
        console.error("Unauthorized: Redirecting to login...");
        // Handle logout / token refresh here
      } else if (status === 403) {
        console.error("Forbidden: You lack permissions for this resource.");
      } else if (status >= 500) {
        console.error("Server Error: Something went wrong on the backend.");
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Network Error: No response received from server.");
    }

    // Format error for UI consumption
    const customError = new Error(
      (error.response?.data as any)?.message ||
        error.message ||
        "An unexpected API error occurred.",
    );

    return Promise.reject(customError);
  },
);
