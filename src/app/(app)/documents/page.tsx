import { DocumentType } from "@prisma/client";
import { EmptyState } from "@/components/app/empty-state";
import { FileUploader } from "@/components/app/file-uploader";
import { PageHeader } from "@/components/app/page-header";
import { createDocument, deleteDocument } from "@/server/document-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { documentTypeLabels } from "@/lib/labels";
import { assertFeatureAccess, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Fahrzeug-Dokumente"
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function expiryBadge(validUntil: Date | null) {
  if (!validUntil) return null;
  const now = Date.now();
  const due = new Date(validUntil).getTime();
  if (due < now) {
    return <Badge tone="danger">Abgelaufen</Badge>;
  }
  if (due - now <= 30 * DAY_IN_MS) {
    return <Badge tone="warning">Läuft bald ab</Badge>;
  }
  return null;
}

export default async function DocumentsPage() {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "documentManagementAccess");

  const [documents, vehicles] = await Promise.all([
    prisma.vehicleDocument.findMany({
      where: { companyId: user.companyId },
      include: { vehicle: true },
      orderBy: [{ vehicleId: "asc" }, { createdAt: "desc" }]
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Dokumente"
        title="Fahrzeug-Dokumente"
        description="Fahrzeugschein, Versicherung, Leasingvertrag und HU/AU-Berichte zentral verwalten."
        actions={
          <Button asChild>
            <a href="#new-document">Dokument hinzufügen</a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Dokumentenablage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:hidden">
              {documents.map((document) => (
                <div key={document.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {document.title}
                      </a>
                      <p className="mt-1 text-muted-foreground">{document.vehicle.licensePlate}</p>
                    </div>
                    <Badge tone="neutral">{documentTypeLabels[document.type]}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                    <span>Gültig bis {formatDate(document.validUntil)}</span>
                    {expiryBadge(document.validUntil)}
                  </div>
                  {document.notes ? <p className="mt-2">{document.notes}</p> : null}
                  <form action={deleteDocument} className="mt-3 flex justify-end">
                    <input type="hidden" name="documentId" value={document.id} />
                    <Button size="sm" variant="destructive">
                      Löschen
                    </Button>
                  </form>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Fahrzeug</th>
                    <th className="py-3 pr-4">Typ</th>
                    <th className="py-3 pr-4">Titel</th>
                    <th className="py-3 pr-4">Gültig bis</th>
                    <th className="py-3 pr-4">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{document.vehicle.licensePlate}</td>
                      <td className="py-3 pr-4">
                        <Badge tone="neutral">{documentTypeLabels[document.type]}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {document.title}
                        </a>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span>{formatDate(document.validUntil)}</span>
                          {expiryBadge(document.validUntil)}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <form action={deleteDocument}>
                          <input type="hidden" name="documentId" value={document.id} />
                          <Button size="sm" variant="destructive">
                            Löschen
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {documents.length === 0 ? (
              <EmptyState
                title="Keine Dokumente vorhanden"
                description="Hinterlegen Sie Fahrzeugschein, Versicherung oder Leasingvertrag, um sie zentral griffbereit zu haben."
                action={
                  <Button asChild size="sm">
                    <a href="#new-document">Dokument hinzufügen</a>
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card id="new-document">
          <CardHeader>
            <CardTitle>Dokument hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <EmptyState
                title="Keine Fahrzeuge verfügbar"
                description="Legen Sie zuerst ein Fahrzeug an, bevor Dokumente hinterlegt werden können."
              />
            ) : (
              <form action={createDocument} className="grid gap-4">
                <SelectBlock name="vehicleId" label="Fahrzeug">
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} · {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </SelectBlock>
                <SelectBlock name="type" label="Typ" defaultValue={DocumentType.REGISTRATION}>
                  {Object.values(DocumentType).map((type) => (
                    <option key={type} value={type}>
                      {documentTypeLabels[type]}
                    </option>
                  ))}
                </SelectBlock>
                <Field name="title" label="Titel" />
                <Field name="validUntil" label="Gültig bis" type="date" />
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea id="notes" name="notes" />
                </div>
                <FileUploader name="fileUrl" kind="document" label="Dokument hochladen" max={1} />
                <Button>Dokument hinzufügen</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} />
    </div>
  );
}

function SelectBlock({
  name,
  label,
  defaultValue,
  children
}: {
  name: string;
  label: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <SelectField id={name} name={name} defaultValue={defaultValue}>
        {children}
      </SelectField>
    </div>
  );
}
