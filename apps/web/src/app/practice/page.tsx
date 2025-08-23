import { PracticeDashboard } from "@/components/PracticeDashboard";
import { PracticeSelector } from "@/components/PracticeSelector";

export default function PracticePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Practice Management
          </h1>
          <p className="text-muted-foreground">
            Manage your legal practice and team
          </p>
        </div>
        <PracticeSelector />
      </div>

      <PracticeDashboard />
    </div>
  );
}
