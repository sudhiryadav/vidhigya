"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Building, Lock, Mail, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    practiceName: "",
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
      // For demo purposes, we'll simulate registration and then login
      // In a real app, you would call a registration API here
      console.log("Registration data:", formData);

      // Simulate successful registration
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo, redirect to login with a success message
      router.push("/login?registered=true");
    } catch (error) {
      setError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 register-page">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.15)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-16 h-16 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 6.742625437410087 6.544734303698458"
                  className="w-full h-full"
                >
                  <g transform="matrix(0.8552956205253794,0,0,0.8552956205253794,0.9613695730965834,4.409676970545758)">
                    <rect
                      width="7.849905415835799"
                      height="7.849905415835799"
                      x="-1.1072799784257121"
                      y="-5.2546798705542725"
                      fill="#ffffff"
                    ></rect>
                    <g
                      transform="matrix(1,0,0,1,0,0)"
                      clipPath="url(#SvgjsClipPath1997)"
                    >
                      <g clipPath="url(#SvgjsClipPath1992b8079b03-9a26-4883-a775-740713942f7c)">
                        <path
                          d=" M 4.474744100446591 -1.137461842620577 C 3.699798132041424 -0.9093468177040993 3.445404104462491 -1.5341135037458766 2.818218232255039 -1.5288007811859585 C 2.191032360047588 -1.5234880586260404 1.887353343720847 -0.9093468177040993 1.2220297131368436 -1.061376065958894 C 0.4753075833312393 -1.232142148241973 0.14368933854207702 -2.41436522289228 0.7447859481785011 -3.0797362884991437 C 1.9840259203022115 -4.4514148444379495 3.96320481396307 -4.306690589703042 4.908584819491313 -3.021912995637179 C 5.558160022486991 -2.138957480187959 4.997430617301376 -1.2913410567667691 4.474744100446591 -1.137461842620577 Z"
                          fill="#006fbf"
                          transform="matrix(1,0,0,1,0,0)"
                          fillRule="nonzero"
                        ></path>
                      </g>
                      <g clipPath="url(#SvgjsClipPath1992b8079b03-9a26-4883-a775-740713942f7c)">
                        <path
                          d=" M 0.4408697567374824 -1.0841448769299684 C 0.5582240032842424 -0.7358769391182078 0.8409367395084388 -0.4418746674541776 1.1442837106751806 -0.3526019544384136 C 1.254863342862789 -0.3188027692814881 1.3697619973234625 -0.3012268382695651 1.4853889600356258 -0.30042342929636234 C 1.7684811764426849 -0.30042342929636234 1.9780965424451598 -0.4170187154774174 2.1807863951106006 -0.5297717648071036 C 2.3682970404619845 -0.6341288150912034 2.5621165438532763 -0.7419011870209666 2.8085889226151854 -0.7419011870209666 L 2.8162259612950673 -0.7419011870209666 C 3.0831902699309444 -0.7396717409467133 3.295319692144804 -0.6169573368171819 3.5001915558616377 -0.4982749096304442 C 3.710850492366959 -0.37636690088947056 3.928624682300735 -0.25028461013713255 4.205455475690744 -0.25028461013713255 C 4.279532455336353 -0.25057490920088377 4.35334353244312 -0.25916684316028826 4.425506546721627 -0.27589952247959015 C 4.773632179464826 -0.3554006207869369 5.058764101854708 -0.6478375366967075 5.1882142792298485 -1.0580556143589375 C 5.339057651913226 -1.535963469637267 5.240914589623317 -2.045273310046546 4.932065155805237 -2.387137519772692 C 4.356820633625555 -3.0238103965514265 3.5943975112544675 -3.374450085506011 2.7857726766212543 -3.374450085506011 C 2.3802851390199424 -3.374735556706657 1.980047116708696 -3.282762241212419 1.6153609226621937 -3.105493505910169 C 1.24504213657716 -2.9251588854193384 0.9242862753109098 -2.6572381901332403 0.6808909723909135 -2.3249502048079416 C 0.38982967214398767 -1.9290575040483464 0.3045889360710209 -1.488528446780864 0.4408697567374824 -1.0841448769299684 Z"
                          fill="#0e1425"
                          transform="matrix(1,0,0,1,0,0)"
                          fillRule="nonzero"
                        ></path>
                      </g>
                    </g>
                  </g>
                </svg>
              </div>
              <span className="font-bold text-foreground text-3xl">
                Vidhigya
              </span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground">Create Account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join Vidhigya and start managing your legal practice
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

            {/* Practice Name Field */}
            <div>
              <label
                htmlFor="practiceName"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Practice Name
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
                  placeholder="Enter your practice name"
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

          {/* Demo Notice */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Demo Notice
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This is a demo application. Registration is simulated for
              demonstration purposes. In a production environment, this would
              create a real user account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              href="/login"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
