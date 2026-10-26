import { AuthError, AuthResponse, LoginCredentials, SignupData, User } from "@/types/auth";

const API_BASE_URL = "/api/v1/auth";

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
        message: "Authentication backend service is currently disconnected (Phase 4).",
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

      return await response.json();
    } catch (err: unknown) {
      if ((err as AuthError)?.code) {
        throw err;
      }
      // Network failure or backend server not running
      throw {
        message:
          "Authentication server is currently unreachable. The backend API service is scheduled for activation in Phase 4.",
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

      return await response.json();
    } catch (err: unknown) {
      if ((err as AuthError)?.code) {
        throw err;
      }
      throw {
        message:
          "Registration service is currently unreachable. The backend API service is scheduled for activation in Phase 4.",
        code: "BACKEND_UNAVAILABLE",
        isBackendUnavailable: true,
      } as AuthError;
    }
  }

  /**
   * Retrieve current authenticated user profile.
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Terminate active session.
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Graceful local cleanup
    }
  }
}

export const authService = new AuthService();
