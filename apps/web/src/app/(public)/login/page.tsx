"use client";

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
      console.log("🔐 Attempting login with:", data.email);
      const result = await login(data.email, data.password);
      console.log("🔐 Login result:", result);

      if (result.success) {
        toast.success("Login successful! Redirecting...");
        console.log("✅ Login successful, waiting for AuthGuard redirect...");
        // Let AuthGuard handle the redirect automatically
      } else {
        console.log("❌ Login failed:", result.error);
        setFormError("root", { message: result.error || "Login failed" });
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) {
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
      console.log("🔐 Attempting demo login with:", demoEmail);
      const result = await login(demoEmail, demoPassword);
      console.log("🔐 Demo login result:", result);

      if (result.success) {
        // Get role from email for better messaging
        let role = "User";
        if (demoEmail.includes("admin")) role = "Super Admin";
        else if (demoEmail.includes("johnson")) role = "Firm Owner";
        else if (demoEmail.includes("patel")) role = "Firm Partner";
        else if (demoEmail.includes("kumar")) role = "Firm Associate";
        else if (demoEmail.includes("sharma")) role = "Firm Paralegal";
        else if (demoEmail.includes("sarah")) role = "Individual Lawyer";

        toast.success(`Welcome! Logged in as ${role}`);
        console.log(
          "✅ Demo login successful as",
          role,
          "- waiting for AuthGuard redirect..."
        );
        // Let AuthGuard handle the redirect automatically
      } else {
        console.log("❌ Demo login failed:", result.error);
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
      <div className="min-h-screen p-4 relative overflow-hidden bg-gradient-to-br from-background via-muted to-accent/20">
        <div className="max-w-md w-full mx-auto space-y-8 pt-8">
          {/* Header */}
          <div className="text-center">
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
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>

              {/* Demo Login Section */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Demo Accounts
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {/* Super Admin Demo */}
                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("admin@vidhigya.com", "admin123")
                    }
                    disabled={demoLoading === "admin@vidhigya.com"}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {demoLoading === "admin@vidhigya.com" ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <span className="mr-2">👑</span>
                        Super Admin Demo
                      </>
                    )}
                  </button>

                  {/* Firm Owner Demo */}
                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("johnson@johnsonlaw.com", "firm123")
                    }
                    disabled={demoLoading === "johnson@johnsonlaw.com"}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {demoLoading === "johnson@johnsonlaw.com" ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <span className="mr-2">🏢</span>
                        Firm Owner Demo
                      </>
                    )}
                  </button>

                  {/* Firm Partner Demo */}
                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("patel@johnsonlaw.com", "partner123")
                    }
                    disabled={demoLoading === "patel@johnsonlaw.com"}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {demoLoading === "patel@johnsonlaw.com" ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <span className="mr-2">🤝</span>
                        Firm Partner Demo
                      </>
                    )}
                  </button>

                  {/* Firm Associate Demo */}
                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("kumar@johnsonlaw.com", "associate123")
                    }
                    disabled={demoLoading === "kumar@johnsonlaw.com"}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {demoLoading === "kumar@johnsonlaw.com" ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <span className="mr-2">👨‍💼</span>
                        Firm Associate Demo
                      </>
                    )}
                  </button>

                  {/* Firm Paralegal Demo */}
                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("sharma@johnsonlaw.com", "paralegal123")
                    }
                    disabled={demoLoading === "sharma@johnsonlaw.com"}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {demoLoading === "sharma@johnsonlaw.com" ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <span className="mr-2">📋</span>
                        Firm Paralegal Demo
                      </>
                    )}
                  </button>

                  {/* Individual Lawyer Demo */}
                  <button
                    type="button"
                    onClick={() =>
                      handleDemoLogin("sarah@wilsonlaw.com", "individual123")
                    }
                    disabled={demoLoading === "sarah@wilsonlaw.com"}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {demoLoading === "sarah@wilsonlaw.com" ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <span className="mr-2">⚖️</span>
                        Individual Lawyer Demo
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Click any demo button above to automatically sign in
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All demo accounts are pre-configured with sample data
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
