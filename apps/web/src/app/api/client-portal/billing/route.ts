import { NextRequest, NextResponse } from "next/server";
import { proxyClientPortalRequest } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  try {
    return await proxyClientPortalRequest(request, "/client-portal/billing");
  } catch (error) {
    console.error("Error fetching client billing records:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing records" },
      { status: 500 }
    );
  }
}
