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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center">
            <Gavel className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-foreground">
            eCourts Services
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
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
                className={`cursor-pointer rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md ${
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

                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {service.title}
                </h3>
                <p className="mb-4 text-muted-foreground">
                  {service.description}
                </p>

                <div className="flex items-center text-primary">
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
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">
                Advanced Search
              </h3>
              <p className="text-sm text-muted-foreground">
                Powerful search capabilities with multiple filters and criteria
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">
                Real-time Data
              </h3>
              <p className="text-sm text-muted-foreground">
                Access up-to-date information directly from eCourts systems
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">
                Comprehensive Coverage
              </h3>
              <p className="text-sm text-muted-foreground">
                Access to courts across all states and union territories
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">
                Integrated Workflow
              </h3>
              <p className="text-sm text-muted-foreground">
                Seamlessly integrated with your existing case management system
              </p>
            </div>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="mt-16 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              Getting Started
            </h2>
            <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
              Start exploring eCourts data by searching for cases or courts. Use
              the search forms to find specific information or browse available
              data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/ecourts/cases/search")}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
              >
                <Search className="w-5 h-5" />
                Search Cases
              </button>
              <button
                onClick={() => router.push("/ecourts/courts/search")}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-foreground transition-colors duration-200 hover:bg-muted"
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
