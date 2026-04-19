import { NextRequest, NextResponse } from "next/server";
import { proxyClientPortalRequest } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  try {
    return await proxyClientPortalRequest(request, "/client-portal/dashboard");
  } catch (error) {
    console.error("Error fetching client dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
