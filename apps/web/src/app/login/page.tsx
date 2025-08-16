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
      console.log("Login form submitted for:", data.email);
      const success = await login(data.email, data.password);
      console.log("Login result:", success);
      if (success) {
        console.log("Login successful, AuthGuard will handle redirect");
        // Login successful, AuthGuard will handle redirect
      } else {
        console.log("Login failed, showing error");
        setFormError("root", { message: "Invalid email or password" });
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
      const success = await login(demoEmail, demoPassword);
      if (success) {
        // Get role from email for better messaging
        let role = "User";
        if (demoEmail.includes("admin")) role = "Super Admin";
        else if (demoEmail.includes("lawyer")) role = "Lawyer";
        else if (demoEmail.includes("client")) role = "Client";

        toast.success(`Welcome! Logged in as ${role}`);
        // Login successful, AuthGuard will handle redirect
      } else {
        setFormError("root", { message: "Invalid email or password" });
        toast.error("Login failed. Please try again.");
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="xl" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to your Vidhigya account
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-card border border-border rounded-xl shadow-lg dark:shadow-xl p-8">
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
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Demo Credentials (Click to login):
              </h4>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDemoLogin("admin@vidhigya.com", "admin123")
                  }
                  disabled={loading || demoLoading !== null}
                  className="w-full text-left p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    handleDemoLogin("lawyer@vidhigya.com", "lawyer123")
                  }
                  disabled={loading || demoLoading !== null}
                  className="w-full text-left p-2 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Lawyer
                      </span>
                      <p className="text-xs text-muted-foreground">
                        lawyer@vidhigya.com
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {demoLoading === "lawyer@vidhigya.com" && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Case management
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDemoLogin("client@vidhigya.com", "client123")
                  }
                  disabled={loading || demoLoading !== null}
                  className="w-full text-left p-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        Client
                      </span>
                      <p className="text-xs text-muted-foreground">
                        client@vidhigya.com
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {demoLoading === "client@vidhigya.com" && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Client portal
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Footer outside the flex centering container */}
      <div className="text-center pb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
}
