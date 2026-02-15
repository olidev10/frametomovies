import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { movieUrl } = (await request.json()) as { movieUrl?: string };

    if (!movieUrl || !movieUrl.startsWith("/generated/")) {
      return NextResponse.json({ error: "Invalid movieUrl." }, { status: 400 });
    }

    const fileName = path.basename(movieUrl);
    const fullPath = path.join(process.cwd(), "public", "generated", fileName);
    await fs.rm(fullPath, { force: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed." },
      { status: 500 },
    );
  }
}
