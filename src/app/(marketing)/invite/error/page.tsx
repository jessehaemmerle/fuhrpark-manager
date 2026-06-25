import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Einladung"
};

export default function InvitationErrorPage({ searchParams }: { searchParams?: { reason?: string } }) {
  return (
    <main className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aktivierung nicht möglich</CardTitle>
          <CardDescription>{searchParams?.reason ?? "Die Einladung konnte nicht angenommen werden."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button asChild variant="outline">
            <Link href="/login">Zum Login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
