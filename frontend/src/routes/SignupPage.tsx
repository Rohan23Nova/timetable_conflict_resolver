import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeSlash,
  Lock,
  Envelope,
  User,
  ArrowLeft,
  WarningCircle,
  Check,
  X,
  Info,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { AuthError } from "@/types/auth";

export const SignupPage: React.FC = () => {
  const { signup, backendAvailable } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const searchParams = new URLSearchParams(location.search);
  const returnUrl = searchParams.get("returnUrl") || location.state?.from?.pathname || "/app";

  // Password requirement tests
  const hasMinLength = password.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const validate = (): boolean => {
    const newErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid institutional email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (!hasMinLength) {
      newErrors.password = "Password must be at least 8 characters.";
    } else if (!hasNumberOrSymbol) {
      newErrors.password = "Password must contain at least one number or special character.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
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
      await signup({ fullName, email, password });
      navigate(returnUrl, { replace: true });
    } catch (err: unknown) {
      const authErr = err as AuthError;
      setErrors({
        general:
          authErr.message || "Registration failed. Please review your details and try again.",
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
          <Badge variant="teal" size="sm" dot>
            Phase 3 Auth Studio
          </Badge>
        </div>
      </div>

      {/* Main Signup Card Container */}
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

          <h2 className="text-2xl font-bold text-content-primary tracking-tight">Create Administrator Account</h2>
          <p className="text-xs text-content-secondary mt-1">
            Register for university examination scheduling studio access.
          </p>
        </div>

        <Card variant="default" className="shadow-elevated">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {/* Backend Connectivity Status Notification */}
            {backendAvailable === false && (
              <div
                role="status"
                className="p-3.5 rounded-lg bg-accent-amber-muted/40 border border-accent-amber/30 text-xs text-content-secondary flex items-start gap-2.5 leading-relaxed"
              >
                <Info size={16} className="text-accent-amber flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-content-primary font-semibold block">
                    Backend Service Integration Notice
                  </strong>
                  The signup interface and password validation rules are live. Real FastAPI user
                  persistence will be connected in Phase 4.
                </div>
              </div>
            )}

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
              {/* Full Name */}
              <Input
                label="Full Name"
                placeholder="Dr. Eleanor Vance"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                error={errors.fullName}
                leftIcon={<User size={16} />}
                autoComplete="name"
                autoFocus
              />

              {/* Institutional Email */}
              <Input
                label="Academic Email"
                type="email"
                placeholder="evance@university.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
                leftIcon={<Envelope size={16} />}
                autoComplete="email"
              />

              {/* Password */}
              <div className="w-full flex flex-col gap-1.5">
                <label
                  htmlFor="signup-password"
                  className="text-xs font-semibold uppercase tracking-wider text-content-secondary"
                >
                  Password
                </label>
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
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
                  autoComplete="new-password"
                />

                {/* Inline Password Requirement Indicators */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-content-muted">
                  <span className={`flex items-center gap-1 ${hasMinLength ? "text-accent-teal font-medium" : ""}`}>
                    {hasMinLength ? <Check size={12} weight="bold" /> : <X size={12} />}
                    8+ characters
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumberOrSymbol ? "text-accent-teal font-medium" : ""}`}>
                    {hasNumberOrSymbol ? <Check size={12} weight="bold" /> : <X size={12} />}
                    1 number / symbol
                  </span>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="w-full flex flex-col gap-1.5">
                <label
                  htmlFor="confirm-password"
                  className="text-xs font-semibold uppercase tracking-wider text-content-secondary"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  error={errors.confirmPassword}
                  leftIcon={<Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="p-1 rounded text-content-muted hover:text-content-primary transition-colors focus-visible:ring-1"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  autoComplete="new-password"
                />
                {confirmPassword && (
                  <span
                    className={`text-[11px] flex items-center gap-1 ${
                      passwordsMatch ? "text-accent-teal font-medium" : "text-accent-danger"
                    }`}
                  >
                    {passwordsMatch ? <Check size={12} weight="bold" /> : <X size={12} />}
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                isLoading={isSubmitting}
              >
                Create Studio Account
              </Button>
            </form>

            {/* Link to Login */}
            <div className="border-t border-border-subtle pt-4 text-center text-xs text-content-secondary">
              Already have an administrator account?{" "}
              <Link
                to={returnUrl !== "/app" ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login"}
                className="text-accent-amber font-semibold hover:underline"
              >
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Disclosures */}
        <div className="mt-6 text-center text-[11px] text-content-muted flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-accent-teal" />
          <span>Zero plaintext password retention policy • Phase 3</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-content-muted py-2">
        <span>SLOTWISE v0.1.0 — University Exam Scheduling Studio</span>
      </footer>
    </div>
  );
};
