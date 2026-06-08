import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isFleetAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !isFleetAdmin(user.role)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: params.id,
      companyId: user.companyId,
      qrCodeEnabled: true
    },
    select: { id: true, qrCodeToken: true, licensePlate: true }
  });

  if (!vehicle?.qrCodeToken) {
    return NextResponse.json({ error: "QR-Code ist nicht aktiv." }, { status: 404 });
  }

  const url = `${getAppUrl()}/v/${vehicle.qrCodeToken}`;
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";

  if (format === "png") {
    const buffer = await QRCode.toBuffer(url, { type: "png", margin: 2, width: 512 });
    const body = Uint8Array.from(buffer).buffer;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${vehicle.licensePlate}-qr.png"`
      }
    });
  }

  const svg = await QRCode.toString(url, { type: "svg", margin: 2, width: 512 });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="${vehicle.licensePlate}-qr.svg"`
    }
  });
}
