"use client";

import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema } from "@/lib/validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";

type LoginFormData = yup.InferType<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema) as Resolver<LoginFormData>,
    mode: "onSubmit",
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setFormError("root", { message: "" });

    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        // Login successful, AuthGuard will handle redirect
      } else {
        // Show the actual error message from the API
        setFormError("root", { message: result.error || "Login failed" });
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) {
        // Show specific error message from API
        setFormError("root", { message: err.message });
      } else {
        setFormError("root", {
          message: "Network error. Please check your connection and try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setValue("email", demoEmail);
    setValue("password", demoPassword);
    setDemoLoading(demoEmail);
    setFormError("root", { message: "" });

    try {
      const result = await login(demoEmail, demoPassword);
      if (result.success) {
        // Get role from email for better messaging
        let role = "User";
        if (demoEmail.includes("admin")) role = "Super Admin";
        else if (demoEmail.includes("johnson")) role = "Firm Owner";
        else if (demoEmail.includes("patel")) role = "Firm Partner";
        else if (demoEmail.includes("kumar")) role = "Firm Associate";
        else if (demoEmail.includes("sharma")) role = "Firm Paralegal";
        else if (demoEmail.includes("sarah")) role = "Individual Lawyer";
        else if (demoEmail.includes("lawyer")) role = "Lawyer";

        toast.success(`Welcome! Logged in as ${role}`);
        // Login successful, AuthGuard will handle redirect
      } else {
        // Show the actual error message from the API
        setFormError("root", { message: result.error || "Login failed" });
        toast.error(result.error || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Demo login error:", err);
      if (err instanceof Error) {
        setFormError("root", { message: err.message });
        toast.error(err.message);
      } else {
        setFormError("root", {
          message: "Network error. Please check your connection and try again.",
        });
        toast.error(
          "Network error. Please check your connection and try again."
        );
      }
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 login-page">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="xl" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your Vidhigya account
            </p>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-lg dark:shadow-xl p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {errors.root && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.root.message}
                  </p>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password")}
                    className="block w-full pl-10 pr-12 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                    placeholder="Enter your password"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded bg-background"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-foreground"
                  >
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <Link
                    href="/forgot-password"
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-muted/60 backdrop-blur-sm rounded-lg border border-border/50">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Demo Credentials (Click to login):
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Note: Client accounts are managed by their respective practices
                and can be added by practice owners.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDemoLogin("admin@vidhigya.com", "admin123")
                  }
                  disabled={loading || demoLoading !== null}
                  className="w-full text-left p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Super Admin
                      </span>
                      <p className="text-xs text-muted-foreground">
                        admin@vidhigya.com
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {demoLoading === "admin@vidhigya.com" && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Full access
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDemoLogin("sarah@wilsonlaw.com", "individual123")
                  }
                  disabled={loading || demoLoading !== null}
                  className="w-full text-left p-2 rounded-md hover:bg-muted/80 transition-colors border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Individual Lawyer
                      </span>
                      <p className="text-xs text-muted-foreground">
                        sarah@wilsonlaw.com
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {demoLoading === "sarah@wilsonlaw.com" && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Solo practice
                      </span>
                    </div>
                  </div>
                </button>

                {/* Firm Practice Accounts */}
                <div className="border-t border-border pt-3 mt-3">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Law Firm Practice
                  </h5>

                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("johnson@johnsonlaw.com", "firm123")
                    }
                    disabled={loading || demoLoading !== null}
                    className="w-full text-left p-2 rounded-md hover:bg-muted/80 transition-colors border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          Firm Owner
                        </span>
                        <p className="text-xs text-muted-foreground">
                          johnson@johnsonlaw.com
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {demoLoading === "johnson@johnsonlaw.com" && (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Practice owner
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("patel@johnsonlaw.com", "partner123")
                    }
                    disabled={loading || demoLoading !== null}
                    className="w-full text-left p-2 rounded-md hover:bg-muted/80 transition-colors border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          Firm Partner
                        </span>
                        <p className="text-xs text-muted-foreground">
                          patel@johnsonlaw.com
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {demoLoading === "johnson@johnsonlaw.com" && (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Partner access
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("kumar@johnsonlaw.com", "associate123")
                    }
                    disabled={loading || demoLoading !== null}
                    className="w-full text-left p-2 rounded-md hover:bg-muted/80 transition-colors border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          Firm Associate
                        </span>
                        <p className="text-xs text-muted-foreground">
                          kumar@johnsonlaw.com
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {demoLoading === "kumar@johnsonlaw.com" && (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Associate access
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("sharma@johnsonlaw.com", "paralegal123")
                    }
                    disabled={loading || demoLoading !== null}
                    className="w-full text-left p-2 rounded-md hover:bg-muted/80 transition-colors border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          Firm Paralegal
                        </span>
                        <p className="text-xs text-muted-foreground">
                          sharma@johnsonlaw.com
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {demoLoading === "sharma@johnsonlaw.com" && (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Paralegal access
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* End Background Pattern */}
      </div>
      {/* Force light theme for login page */}
      <style jsx global>{`
        .login-page {
          background: linear-gradient(
            to bottom right,
            rgb(239 246 255),
            rgb(238 242 255),
            rgb(219 234 254)
          ) !important;
        }

        .dark .login-page {
          background: linear-gradient(
            to bottom right,
            rgb(15 23 42),
            rgb(30 41 59),
            rgb(51 65 85)
          ) !important;
        }
      `}</style>
    </>
  );
}
