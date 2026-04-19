import { NextRequest, NextResponse } from "next/server";

export async function proxyClientPortalRequest(
  request: NextRequest,
  targetPath: string,
  init: RequestInit = {}
) {
  const token = request.headers.get("authorization");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend API URL is not configured" },
      { status: 500 }
    );
  }

  const response = await fetch(`${backendUrl}${targetPath}`, {
    ...init,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return NextResponse.json(
      { error: "Client portal is currently disabled on the backend" },
      { status: 503 }
    );
  }

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      {
        error: text || `Backend responded with status ${response.status}`,
      },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
