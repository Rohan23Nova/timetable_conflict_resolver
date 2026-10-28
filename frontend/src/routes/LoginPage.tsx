import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeSlash,
  Lock,
  Envelope,
  ArrowLeft,
  WarningCircle,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { AuthError } from "@/types/auth";

export const LoginPage: React.FC = () => {
  const { login, backendAvailable } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  // Extract destination from URL or state
  const searchParams = new URLSearchParams(location.search);
  const returnUrl = searchParams.get("returnUrl") || location.state?.from?.pathname || "/app";

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid academic or professional email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate(returnUrl, { replace: true });
    } catch (err: unknown) {
      const authErr = err as AuthError;
      setErrors({
        general:
          authErr.message || "Authentication failed. Please verify your credentials and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrors({});
    setIsSubmitting(true);
    try {
      await login({ email: demoEmail, password: demoPass });
      navigate(returnUrl, { replace: true });
    } catch (err: unknown) {
      const authErr = err as AuthError;
      setErrors({
        general: authErr.message || "Authentication failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar with Back to Landing Link */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary transition-colors p-1 rounded focus-visible:ring-1"
        >
          <ArrowLeft size={14} />
          <span>Back to Landing Page</span>
        </Link>
        <div className="flex items-center gap-2">
          {backendAvailable ? (
            <Badge variant="teal" size="sm" dot>
              Auth Service Online
            </Badge>
          ) : (
            <Badge variant="amber" size="sm" dot>
              Connecting...
            </Badge>
          )}
        </div>
      </div>

      {/* Main Login Card Container */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="text-center mb-8">
          {/* Brand Logo */}
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group focus-visible:ring-1 rounded p-1">
            <div className="w-9 h-9 rounded-lg bg-[#111318] border border-border-strong flex items-center justify-center flex-shrink-0 shadow-subtle group-hover:border-accent-amber transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="8" r="2.5" fill="#F5A64A" />
                <circle cx="17" cy="7" r="2" fill="#69C9B1" />
                <circle cx="12" cy="17" r="2.5" fill="#F5A64A" />
                <line x1="7" y1="8" x2="17" y2="7" stroke="#F5A64A" strokeWidth="1.5" strokeOpacity="0.6" />
                <line x1="7" y1="8" x2="12" y2="17" stroke="#69C9B1" strokeWidth="1.5" strokeOpacity="0.6" />
                <line x1="17" y1="7" x2="12" y2="17" stroke="#F5A64A" strokeWidth="1.5" strokeOpacity="0.6" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-content-primary">SLOTWISE</span>
          </Link>

          <h2 className="text-2xl font-bold text-content-primary tracking-tight">Sign in to Studio</h2>
          <p className="text-xs text-content-secondary mt-1">
            Enter your academic administrator credentials to access scheduling operations.
          </p>
        </div>

        <Card variant="default" className="shadow-elevated">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {/* Quick Demo Accounts Selection */}
            <div className="p-3 rounded-lg bg-subtle/80 border border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={13} className="text-accent-amber" />
                  Pre-configured Demo Accounts
                </span>
                <span className="text-content-muted text-[10px]">Click to auto-fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@university.edu");
                    setPassword("admin123");
                    setErrors({});
                  }}
                  className="px-2.5 py-1.5 rounded bg-surface hover:bg-surface-hover border border-border-subtle hover:border-accent-amber text-left text-xs transition-colors flex flex-col"
                >
                  <span className="font-semibold text-content-primary">Dr. Eleanor Vance</span>
                  <span className="text-[10px] text-content-muted">admin@university.edu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("scheduler@university.edu");
                    setPassword("scheduler123");
                    setErrors({});
                  }}
                  className="px-2.5 py-1.5 rounded bg-surface hover:bg-surface-hover border border-border-subtle hover:border-accent-amber text-left text-xs transition-colors flex flex-col"
                >
                  <span className="font-semibold text-content-primary">Prof. Alan Turing</span>
                  <span className="text-[10px] text-content-muted">scheduler@university.edu</span>
                </button>
              </div>
            </div>

            {/* General Submission Error Banner */}
            {errors.general && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-accent-danger-muted/40 border border-accent-danger/30 text-xs text-accent-danger flex items-start gap-2.5 leading-relaxed"
              >
                <WarningCircle size={16} className="flex-shrink-0 mt-0.5" weight="bold" />
                <div>{errors.general}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email Address */}
              <Input
                label="Academic Email"
                type="email"
                placeholder="admin@university.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
                leftIcon={<Envelope size={16} />}
                autoComplete="email"
                autoFocus
              />

              {/* Password */}
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password-input"
                    className="text-xs font-semibold uppercase tracking-wider text-content-secondary"
                  >
                    Password
                  </label>
                </div>
                <Input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  error={errors.password}
                  leftIcon={<Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="p-1 rounded text-content-muted hover:text-content-primary transition-colors focus-visible:ring-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  autoComplete="current-password"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                isLoading={isSubmitting}
              >
                Sign In to Studio
              </Button>
            </form>

            {/* 1-Click Quick Demo Sign In */}
            <Button
              type="button"
              variant="secondary"
              className="w-full text-xs"
              size="sm"
              isLoading={isSubmitting}
              onClick={() => handleQuickLogin("admin@university.edu", "admin123")}
            >
              ⚡ 1-Click Sign In as Demo Admin
            </Button>

            {/* Link to Signup */}
            <div className="border-t border-border-subtle pt-4 text-center text-xs text-content-secondary">
              Don't have an academic account?{" "}
              <Link
                to={returnUrl !== "/app" ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}` : "/signup"}
                className="text-accent-amber font-semibold hover:underline"
              >
                Create one now
              </Link>
            </div>

            {/* Development Evaluation Access */}
            <div className="pt-1 text-center">
              <Link to="/app">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Enter Studio in Development Mode
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Disclosures */}
        <div className="mt-6 text-center text-[11px] text-content-muted flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-accent-teal" />
          <span>PBKDF2 SHA-256 salted password hashing & session management</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-content-muted py-2">
        <span>SLOTWISE v0.1.0 — University Exam Scheduling Studio</span>
      </footer>
    </div>
  );
};
