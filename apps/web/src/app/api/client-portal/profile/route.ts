import { NextRequest, NextResponse } from "next/server";
import { proxyClientPortalRequest } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  try {
    return await proxyClientPortalRequest(request, "/client-portal/profile");
  } catch (error) {
    console.error("Error fetching client profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await proxyClientPortalRequest(request, "/client-portal/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Error updating client profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
