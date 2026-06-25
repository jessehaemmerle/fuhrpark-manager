import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { saveUploadedFile } from "@/lib/storage";
import { storageProvider } from "@/lib/upload";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    assertRateLimit(`upload:${user.id}`, 30, 60_000);

    const formData = await request.formData();
    const isDocument = formData.get("kind") === "document";
    const allowed = isDocument
      ? [...storageProvider.acceptedMimeTypes, "application/pdf"]
      : storageProvider.acceptedMimeTypes;

    const files = formData.getAll("file").filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "Keine Datei empfangen." }, { status: 400 });
    }
    if (files.length > storageProvider.maxPhotoUrls) {
      return NextResponse.json({ error: `Maximal ${storageProvider.maxPhotoUrls} Dateien pro Upload.` }, { status: 400 });
    }

    const urls: string[] = [];
    for (const file of files) {
      const saved = await saveUploadedFile(file, { allowed });
      urls.push(saved.url);
    }

    return NextResponse.json({ ok: true, urls });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload fehlgeschlagen." }, { status: 400 });
  }
}
