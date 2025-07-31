"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("Login form submitted for:", email);
      const success = await login(email, password);
      console.log("Login result:", success);
      if (success) {
        console.log("Login successful, AuthGuard will handle redirect");
        // Login successful, AuthGuard will handle redirect
      } else {
        console.log("Login failed, showing error");
        setError("Invalid email or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) {
        // Show specific error message from API
        setError(err.message);
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setDemoLoading(demoEmail);
    setError("");

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
        setError("Invalid email or password");
        toast.error("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Demo login error:", err);
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("Network error. Please check your connection and try again.");
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
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-2xl">V</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to your Vidhigya account
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
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
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
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
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
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
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        admin@vidhigya.com
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {demoLoading === "admin@vidhigya.com" && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
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
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        lawyer@vidhigya.com
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {demoLoading === "lawyer@vidhigya.com" && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
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
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        client@vidhigya.com
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {demoLoading === "client@vidhigya.com" && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
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
