import { NextRequest, NextResponse } from "next/server";
import { proxyClientPortalRequest } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  try {
    return await proxyClientPortalRequest(request, "/client-portal/events");
  } catch (error) {
    console.error("Error fetching client events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
