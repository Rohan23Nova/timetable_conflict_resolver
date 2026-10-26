import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "../routes/LoginPage";
import { SignupPage } from "../routes/SignupPage";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { authService } from "../services/authService";

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname + location.search}</div>;
};

const renderWithProviders = async (ui: React.ReactElement, initialRoute = "/") => {
  const rendered = render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter
          initialEntries={[initialRoute]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {ui}
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
  // Allow AuthProvider's mount effect to settle
  await waitFor(() => {
    expect(rendered.container).toBeInTheDocument();
  });
  return rendered;
};

describe("Authentication & Protected Routes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Login Form Validation", () => {
    it("validates empty email and password submission", async () => {
      await renderWithProviders(<LoginPage />, "/login");

      const submitButton = screen.getByRole("button", { name: "Sign In to Studio" });
      fireEvent.click(submitButton);

      expect(screen.getByText("Email address is required.")).toBeInTheDocument();
      expect(screen.getByText("Password is required.")).toBeInTheDocument();
    });

    it("validates malformed email formats", async () => {
      await renderWithProviders(<LoginPage />, "/login");

      const emailInput = screen.getByLabelText("Academic Email");
      fireEvent.change(emailInput, { target: { value: "not-an-email" } });

      const submitButton = screen.getByRole("button", { name: "Sign In to Studio" });
      fireEvent.click(submitButton);

      expect(
        screen.getByText("Please enter a valid academic or professional email address.")
      ).toBeInTheDocument();
    });

    it("toggles password visibility with accessible label", async () => {
      await renderWithProviders(<LoginPage />, "/login");

      const passwordInput = screen.getByPlaceholderText("••••••••••••");
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = screen.getByLabelText("Show password");
      fireEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByLabelText("Hide password")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Hide password"));
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("displays error banner on authentication rejection", async () => {
      vi.spyOn(authService, "login").mockRejectedValueOnce({
        message: "Invalid email or password. Please check your credentials.",
        code: "INVALID_CREDENTIALS",
      });

      await renderWithProviders(<LoginPage />, "/login");

      fireEvent.change(screen.getByLabelText("Academic Email"), {
        target: { value: "admin@university.edu" },
      });
      fireEvent.change(screen.getByPlaceholderText("••••••••••••"), {
        target: { value: "wrongpassword123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Sign In to Studio" }));

      await waitFor(() => {
        expect(
          screen.getByText("Invalid email or password. Please check your credentials.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Signup Form Validation", () => {
    it("validates required fields on signup", async () => {
      await renderWithProviders(<SignupPage />, "/signup");

      const submitButton = screen.getByRole("button", { name: "Create Studio Account" });
      fireEvent.click(submitButton);

      expect(screen.getByText("Full name is required.")).toBeInTheDocument();
      expect(screen.getByText("Email address is required.")).toBeInTheDocument();
      expect(screen.getByText("Password is required.")).toBeInTheDocument();
    });

    it("validates password minimum length and confirmation matching", async () => {
      await renderWithProviders(<SignupPage />, "/signup");

      fireEvent.change(screen.getByLabelText("Full Name"), {
        target: { value: "Prof. Alan Turing" },
      });
      fireEvent.change(screen.getByLabelText("Academic Email"), {
        target: { value: "turing@cambridge.ac.uk" },
      });

      // Short password (< 8 chars)
      fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
        target: { value: "short1" },
      });
      fireEvent.change(screen.getByPlaceholderText("Repeat your password"), {
        target: { value: "different123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Studio Account" }));

      expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });

    it("validates password requires number or special character", async () => {
      await renderWithProviders(<SignupPage />, "/signup");

      fireEvent.change(screen.getByLabelText("Full Name"), {
        target: { value: "Prof. Alan Turing" },
      });
      fireEvent.change(screen.getByLabelText("Academic Email"), {
        target: { value: "turing@cambridge.ac.uk" },
      });

      // 8+ chars but no numbers or special symbols
      fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
        target: { value: "lettersletters" },
      });
      fireEvent.change(screen.getByPlaceholderText("Repeat your password"), {
        target: { value: "lettersletters" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Studio Account" }));

      expect(
        screen.getByText("Password must contain at least one number or special character.")
      ).toBeInTheDocument();
    });
  });

  describe("Protected Route Guard", () => {
    it("redirects unauthenticated user to login with returnUrl", async () => {
      render(
        <ThemeProvider>
          <AuthProvider>
            <MemoryRouter
              initialEntries={["/app/overview"]}
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <Routes>
                <Route path="/login" element={<LocationDisplay />} />
                <Route
                  path="/app/*"
                  element={
                    <ProtectedRoute>
                      <div>Protected Content</div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </ThemeProvider>
      );

      // Should redirect to /login?returnUrl=%2Fapp%2Foverview
      await waitFor(() => {
        expect(screen.getByTestId("location-display")).toHaveTextContent(
          "/login?returnUrl=%2Fapp%2Foverview"
        );
      });
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });
});
