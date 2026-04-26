"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/services/api";
import { CreditCard, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface PracticeSubscriptionRow {
  practiceId: string;
  practiceName: string;
  plan: string;
  status: string;
  seatLimit: number;
  activeMembers: number;
  availableSeats: number;
  razorpaySubscriptionId?: string | null;
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<PracticeSubscriptionRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const response = (await apiClient.getSubscriptionsOverview()) as
        | PracticeSubscriptionRow[]
        | undefined;
      setRows(response || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.practiceName.toLowerCase().includes(q) ||
        row.plan.toLowerCase().includes(q) ||
        (row.razorpaySubscriptionId || "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground">
            Super admin view for practice subscription health and Razorpay linkage.
          </p>
        </div>
        <Button onClick={load} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Help</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1) Configure Razorpay env keys and plan IDs in backend environment.</p>
          <p>2) Practice owner starts checkout from billing page subscription card.</p>
          <p>3) Razorpay webhook updates subscription status automatically.</p>
          <p>4) Seat limits are enforced on user creation for each practice.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Practice Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subscription-search">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="subscription-search"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search practice, plan, or Razorpay subscription ID"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">
                    Practice
                  </th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">
                    Plan
                  </th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">
                    Seats
                  </th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">
                    Razorpay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.practiceId}>
                    <td className="py-2 px-3">
                      <div className="font-medium text-foreground">{row.practiceName}</div>
                      <div className="text-xs text-muted-foreground">{row.practiceId}</div>
                    </td>
                    <td className="py-2 px-3">
                      <Badge>{row.plan}</Badge>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                    <td className="py-2 px-3 text-sm">
                      {row.activeMembers}/{row.seatLimit} used ({row.availableSeats} left)
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {row.razorpaySubscriptionId || "Not linked"}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No subscriptions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
