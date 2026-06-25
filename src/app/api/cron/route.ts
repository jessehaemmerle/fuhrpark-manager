import { NextRequest, NextResponse } from "next/server";
import { runScheduledJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const query = request.nextUrl.searchParams.get("secret");
  return bearer === secret || query === secret;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }
  try {
    const result = await runScheduledJobs();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Job fehlgeschlagen." }, { status: 500 });
  }
}

export const GET = POST;
