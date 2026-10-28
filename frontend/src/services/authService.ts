import { AuthError, AuthResponse, LoginCredentials, SignupData, User } from "@/types/auth";

const API_BASE_URL = "/api/v1/auth";
const TOKEN_KEY = "slotwise_auth_token";
const USER_KEY = "slotwise_auth_user";

class AuthService {
  /**
   * Check whether the authentication backend service is reachable.
   */
  async checkHealth(): Promise<{ isAvailable: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        return { isAvailable: true, message: "Backend authentication service is operational." };
      }
      return {
        isAvailable: false,
        message: "Authentication backend service returned a non-200 status code.",
      };
    } catch {
      return {
        isAvailable: false,
        message: "Authentication backend service is currently unreachable.",
      };
    }
  }

  /**
   * Authenticate user with email and password against backend endpoints.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw {
            message: "Invalid email or password. Please check your credentials.",
            code: "INVALID_CREDENTIALS",
          } as AuthError;
        }

        const data = await response.json().catch(() => ({}));
        throw {
          message: data.detail || "Authentication request failed on server.",
          code: `HTTP_${response.status}`,
        } as AuthError;
      }

      const data: AuthResponse = await response.json();
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      return data;
    } catch (err: unknown) {
      if ((err as AuthError)?.code) {
        throw err;
      }
      // Network failure or backend server not running
      throw {
        message:
          "Authentication server is currently unreachable. Please ensure the backend is running at http://127.0.0.1:8000.",
        code: "BACKEND_UNAVAILABLE",
        isBackendUnavailable: true,
      } as AuthError;
    }
  }

  /**
   * Register a new user account.
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.detail || "Account creation failed on server.",
          code: `HTTP_${response.status}`,
        } as AuthError;
      }

      const resData: AuthResponse = await response.json();
      if (resData.token) {
        localStorage.setItem(TOKEN_KEY, resData.token);
      }
      if (resData.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(resData.user));
      }

      return resData;
    } catch (err: unknown) {
      if ((err as AuthError)?.code) {
        throw err;
      }
      throw {
        message:
          "Registration service is currently unreachable. Please ensure the backend is running at http://127.0.0.1:8000.",
        code: "BACKEND_UNAVAILABLE",
        isBackendUnavailable: true,
      } as AuthError;
    }
  }

  /**
   * Retrieve current authenticated user profile.
   */
  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const user = await response.json();
        if (user) {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          return user;
        }
      }

      // If token verification fails or no user returned, fall back to cached user if present
      const cached = localStorage.getItem(USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      const cached = localStorage.getItem(USER_KEY);
      return cached ? JSON.parse(cached) : null;
    }
  }

  /**
   * Terminate active session.
   */
  async logout(): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // Graceful local cleanup
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
}

export const authService = new AuthService();
