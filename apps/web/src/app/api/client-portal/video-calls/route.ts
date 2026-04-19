import { NextRequest, NextResponse } from "next/server";
import { proxyClientPortalRequest } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  try {
    return await proxyClientPortalRequest(request, "/client-portal/video-calls");
  } catch (error) {
    console.error("Error fetching client video calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch video calls" },
      { status: 500 }
    );
  }
}
