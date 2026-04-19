"use client";

import { AlertCircle, Calendar } from "lucide-react";

export default function HearingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Hearings</h1>
          <p className="text-muted-foreground">
            View and manage court hearings
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Hearings functionality is coming soon. This feature will allow you
              to view hearing schedules, details, and updates.
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <div className="py-12 text-center">
            <Calendar className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium text-foreground">
              Hearings Coming Soon
            </h3>
            <p className="text-muted-foreground">
              This feature is currently under development and will be available
              soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
