"use client";

import FontSizeSelector from "@/components/FontSizeSelector";
import CustomSelect from "@/components/ui/select";
import { useFontSize } from "@/contexts/FontSizeContext";

export default function TestFontSizePage() {
  const { fontSize } = useFontSize();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Font Size Test Page
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Font Size Selector */}
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Font Size Settings
            </h2>
            <FontSizeSelector />
          </div>

          {/* Font Size Preview */}
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Current Font Size:{" "}
              <span className="text-blue-600 dark:text-blue-400">
                {fontSize}
              </span>
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Headings
                </h3>
                <div className="space-y-2">
                  <h1 className="text-6xl font-bold text-foreground">
                    H1 Heading
                  </h1>
                  <h2 className="text-5xl font-bold text-foreground">
                    H2 Heading
                  </h2>
                  <h3 className="text-4xl font-bold text-foreground">
                    H3 Heading
                  </h3>
                  <h4 className="text-3xl font-bold text-foreground">
                    H4 Heading
                  </h4>
                  <h5 className="text-2xl font-bold text-foreground">
                    H5 Heading
                  </h5>
                  <h6 className="text-xl font-bold text-foreground">
                    H6 Heading
                  </h6>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Body Text
                </h3>
                <div className="space-y-2">
                  <p className="text-base text-gray-700 dark:text-gray-300">
                    This is base text size. Lorem ipsum dolor sit amet,
                    consectetur adipiscing elit. Sed do eiusmod tempor
                    incididunt ut labore et dolore magna aliqua.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This is small text. Ut enim ad minim veniam, quis nostrud
                    exercitation ullamco laboris nisi ut aliquip ex ea commodo
                    consequat.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    This is extra small text. Duis aute irure dolor in
                    reprehenderit in voluptate velit esse cillum dolore eu
                    fugiat nulla pariatur.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Form Elements
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Input field text"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                  <CustomSelect
                    value={{ value: "option1", label: "Select option text" }}
                    onChange={(option) => console.log("Selected:", option)}
                    options={[
                      { value: "option1", label: "Select option text" },
                      { value: "option2", label: "Option 1" },
                      { value: "option3", label: "Option 2" },
                    ]}
                    placeholder="Select an option..."
                    className="w-full"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Button text
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  UI Elements
                </h3>
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                    Badge text
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Card content text. Excepteur sint occaecat cupidatat non
                      proident, sunt in culpa qui officia deserunt mollit anim
                      id est laborum.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-card p-6 rounded-lg shadow-sm border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            How It Works
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              • <strong>Font Size Variables:</strong> The application uses CSS
              custom properties (variables) to control font sizes throughout the
              interface.
            </p>
            <p>
              • <strong>User Settings:</strong> Font size preference is stored
              in user settings and persists across sessions.
            </p>
            <p>
              • <strong>Global Application:</strong> Changes apply to all text
              elements across the entire application immediately.
            </p>
            <p>
              • <strong>Responsive Design:</strong> Font sizes scale
              proportionally while maintaining readability and design
              consistency.
            </p>
            <p>
              • <strong>Accessibility:</strong> Larger font sizes improve
              readability for users with visual impairments or those who prefer
              larger text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
