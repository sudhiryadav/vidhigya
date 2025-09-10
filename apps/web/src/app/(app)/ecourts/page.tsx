"use client";

import {
  ArrowRight,
  Building2,
  Calendar,
  FileText,
  Gavel,
  Search,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ECourtsPage() {
  const router = useRouter();

  const services = [
    {
      title: "Case Search",
      description:
        "Search for cases by case number, party name, advocate, or other criteria",
      icon: Search,
      href: "/ecourts/cases/search",
      color: "bg-blue-500",
    },
    {
      title: "Court Search",
      description:
        "Find courts by location, type, or name across different states and districts",
      icon: Building2,
      href: "/ecourts/courts/search",
      color: "bg-green-500",
    },
    {
      title: "Judge Search",
      description:
        "Search for judges by name, court, or designation (Coming Soon)",
      icon: User,
      href: "/ecourts/judges/search",
      color: "bg-purple-500",
      comingSoon: true,
    },
    {
      title: "Hearings",
      description: "View hearing schedules and details for cases (Coming Soon)",
      icon: Calendar,
      href: "/ecourts/hearings",
      color: "bg-orange-500",
      comingSoon: true,
    },
    {
      title: "Orders",
      description:
        "Access court orders, judgments, and related documents (Coming Soon)",
      icon: FileText,
      href: "/ecourts/orders",
      color: "bg-red-500",
      comingSoon: true,
    },
  ];

  const handleServiceClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Gavel className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            eCourts Services
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Access comprehensive eCourts data including case information, court
            details, hearings, orders, and more through our integrated platform.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  service.comingSoon ? "opacity-75" : "hover:shadow-lg"
                }`}
                onClick={() => handleServiceClick(service.href)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-3 rounded-lg ${service.color} bg-opacity-10`}
                  >
                    <Icon
                      className={`w-6 h-6 ${service.color.replace("bg-", "text-")}`}
                    />
                  </div>
                  {service.comingSoon && (
                    <span className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {service.description}
                </p>

                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <span className="text-sm font-medium">
                    {service.comingSoon ? "Learn More" : "Get Started"}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Advanced Search
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Powerful search capabilities with multiple filters and criteria
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Real-time Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Access up-to-date information directly from eCourts systems
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Comprehensive Coverage
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Access to courts across all states and union territories
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Integrated Workflow
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Seamlessly integrated with your existing case management system
              </p>
            </div>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="mt-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Getting Started
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Start exploring eCourts data by searching for cases or courts. Use
              the search forms to find specific information or browse available
              data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/ecourts/cases/search")}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Search Cases
              </button>
              <button
                onClick={() => router.push("/ecourts/courts/search")}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Building2 className="w-5 h-5" />
                Search Courts
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
