import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/server";

export async function GET(request: Request) {
  const context = await getAuthContext(request);

  if (!context) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: context.userId,
      email: context.email,
    },
    profile: context.profile,
  });
}