"use client";

import { AlertCircle, Calendar } from "lucide-react";
import { useState } from "react";

export default function HearingsPage() {
  const [isLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Hearings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage court hearings
          </p>
        </div>

        {/* Coming Soon Alert */}
        <div className="mb-8">
          <div className="border border-blue-200 text-blue-800 bg-blue-50 dark:border-blue-800 dark:text-blue-200 dark:bg-blue-900/20 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>
              Hearings functionality is coming soon. This feature will allow you
              to view hearing schedules, details, and updates.
            </span>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Hearings Coming Soon
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              This feature is currently under development and will be available
              soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
