import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getInvoicePdf } from "@/lib/invoice-render";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["PLATFORM_ADMIN"])) {
    return new NextResponse("Nicht berechtigt.", { status: 403 });
  }

  const pdf = await getInvoicePdf(params.id).catch(() => null);
  if (!pdf) {
    return new NextResponse("Rechnung nicht gefunden oder noch nicht finalisiert.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdf.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung-${pdf.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}
