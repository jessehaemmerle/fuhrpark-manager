import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { AlertTriangle, CalendarPlus, Car, Gauge, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isFleetAdmin } from "@/lib/auth";

export function QuickActions({ role }: { role: UserRole }) {
  const manager = isFleetAdmin(role);
  const actions = [
    { href: "/bookings#new-booking", label: "Buchen", icon: CalendarPlus, visible: true },
    { href: "/trip-log#start-trip", label: "Fahrt", icon: Gauge, visible: true },
    { href: "/damage-reports#new-damage", label: "Schaden", icon: AlertTriangle, visible: true },
    { href: "/vehicles#new-vehicle", label: "Fahrzeug", icon: Car, visible: manager },
    { href: "/maintenance#new-maintenance", label: "Wartung", icon: Wrench, visible: manager }
  ].filter((action) => action.visible);

  return (
    <div className="flex w-full gap-2 overflow-x-auto pb-1 lg:w-auto lg:pb-0" aria-label="Schnellaktionen">
      {actions.map((action) => (
        <Button key={action.href} asChild size="sm" variant="outline" className="shrink-0">
          <Link href={action.href}>
            <action.icon className="h-4 w-4" aria-hidden />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
