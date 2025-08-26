"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase,
  Building,
  Lock,
  Mail,
  Phone,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    businessType: "individual", // individual, firm
    practiceName: "",
    estimatedUsers: 1, // For subscription pricing
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Determine user role based on business type
      const userRole =
        formData.businessType === "individual" ? "LAWYER" : "ADMIN";

      // Prepare registration data for backend
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: userRole,
        phone: formData.phone || undefined,
        practiceName: formData.practiceName || undefined,
        businessType: formData.businessType,
      };

      console.log("Registering user with data:", registrationData);

      // Call backend registration API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registrationData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const result = await response.json();
      console.log("Registration successful:", result);

      // If registration is successful, automatically log in the user
      if (result.token) {
        // Store the token and user data
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        // If no token, redirect to login with success message
        router.push("/login?registered=true");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 register-page">
      <div className="max-w-md w-full mx-auto space-y-8 pt-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Create Account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join Vidhigya and start managing your legal practice
          </p>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sign in
            </Link>
          </p>
        </div>
        {/* Registration Form */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-lg dark:shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Enter your email"
                  className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Enter your phone number"
                  className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Business Type Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Business Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="businessType"
                    value="individual"
                    checked={formData.businessType === "individual"}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Individual Lawyer</span>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="businessType"
                    value="firm"
                    checked={formData.businessType === "firm"}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Law Firm</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Estimated Users (for subscription pricing) */}
            {formData.businessType === "firm" && (
              <div>
                <label
                  htmlFor="estimatedUsers"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Estimated Team Size
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <select
                    id="estimatedUsers"
                    name="estimatedUsers"
                    value={formData.estimatedUsers}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value={1}>1-5 users</option>
                    <option value={5}>6-10 users</option>
                    <option value={10}>11-25 users</option>
                    <option value={25}>26-50 users</option>
                    <option value={50}>50+ users</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This helps us provide accurate pricing for your subscription
                  plan.
                </p>
              </div>
            )}

            {/* Practice Name Field */}
            <div>
              <label
                htmlFor="practiceName"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {formData.businessType === "individual"
                  ? "Practice Name"
                  : "Firm Name"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="practiceName"
                  name="practiceName"
                  type="text"
                  autoComplete="organization"
                  placeholder={
                    formData.businessType === "individual"
                      ? "Enter your practice name"
                      : "Enter your firm name"
                  }
                  className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                  value={formData.practiceName}
                  onChange={handleInputChange}
                />
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
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Create a password"
                  className="block w-full pl-10 pr-12 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  className="block w-full pl-10 pr-12 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Subscription Pricing Notice */}
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Subscription-Based Pricing
            </h4>
            <p className="text-xs text-green-700 dark:text-green-300 mb-2">
              Our pricing is based on the number of users in your practice:
            </p>
            <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
              <div>
                • <strong>Individual Lawyer:</strong> $29/month
              </div>
              <div>
                • <strong>Small Firm (1-5 users):</strong> $99/month
              </div>
              <div>
                • <strong>Medium Firm (6-25 users):</strong> $199/month
              </div>
              <div>
                • <strong>Large Firm (25+ users):</strong> Custom pricing
              </div>
            </div>
          </div>

          {/* Demo Notice */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Demo Notice
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This is a demo application. Registration is simulated for
              demonstration purposes. In a production environment, this would
              create a real user account with subscription billing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
