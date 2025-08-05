"use client";

import CustomSelect from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";

export default function TestThemePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Theme Test Page
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Current Theme
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Selected Theme: <span className="font-mono">{theme}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Resolved Theme: <span className="font-mono">{resolvedTheme}</span>
            </p>

            <div className="space-y-2">
              <button
                onClick={() => setTheme("light")}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Set Light Theme
              </button>
              <button
                onClick={() => setTheme("dark")}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
              >
                Set Dark Theme
              </button>
              <button
                onClick={() => setTheme("system")}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Set System Theme
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Theme Elements Test
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="text-gray-800 dark:text-gray-200">
                  Background: gray-100 / dark:bg-gray-700
                </p>
              </div>
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
                <p className="text-blue-800 dark:text-blue-200">
                  Background: blue-100 / dark:bg-blue-900
                </p>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900 rounded">
                <p className="text-green-800 dark:text-green-200">
                  Background: green-100 / dark:bg-green-900
                </p>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900 rounded">
                <p className="text-red-800 dark:text-red-200">
                  Background: red-100 / dark:bg-red-900
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Form Elements Test
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Input Field
              </label>
              <input
                type="text"
                placeholder="Type something..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Field
              </label>
              <CustomSelect
                value={{ value: "option1", label: "Option 1" }}
                onChange={(option) => console.log("Selected:", option)}
                options={[
                  { value: "option1", label: "Option 1" },
                  { value: "option2", label: "Option 2" },
                  { value: "option3", label: "Option 3" },
                ]}
                placeholder="Select an option..."
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
