import { PracticeDashboard } from "@/components/PracticeDashboard";
import PracticeSelector from "@/components/PracticeSelector";

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Practice Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your legal practice and team
              </p>
            </div>
            <PracticeSelector />
          </div>
        </div>

        <PracticeDashboard />
      </div>
    </div>
  );
}
