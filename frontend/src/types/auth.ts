/**
 * Authentication and User data models for SLOTWISE.
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "scheduler" | "viewer";
  institution?: string;
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  expiresIn?: number;
}

export interface AuthError {
  message: string;
  code?: string;
  field?: string;
  isBackendUnavailable?: boolean;
}
