import { Activity, AlertTriangle, CalendarCheck, Car, Gauge, QrCode, Wrench } from "lucide-react";

const rows = [
  ["M-B 240", "Verfuegbar", "Berlin", "34.210 km"],
  ["ID.4 118", "Gebucht", "Wien", "18.880 km"],
  ["Transit 07", "Wartung", "Dornbirn", "72.040 km"],
  ["Atego 12", "Pruefung", "Muenchen", "91.110 km"]
];

const metrics = [
  { icon: Car, value: "42", label: "Fahrzeuge" },
  { icon: CalendarCheck, value: "18", label: "Buchungen" },
  { icon: Gauge, value: "7.820", label: "km diesen Monat" },
  { icon: AlertTriangle, value: "3", label: "offene Schaeden" }
];

export function HeroDashboard() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-80" aria-hidden>
      <div className="surface-grid absolute inset-0 bg-zinc-950" />
      <div className="absolute inset-0 bg-[rgba(2,6,23,0.58)]" />
      <div className="absolute left-1/2 top-10 w-[980px] -translate-x-1/2 rounded-lg border border-white/10 bg-white/10 p-4 shadow-soft backdrop-blur md:top-16">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white">
            <Car className="h-5 w-5 text-teal-300" />
            <span className="font-semibold">Fleetbase Command Center</span>
          </div>
          <div className="flex gap-2 text-xs text-white/70">
            <span>Trial aktiv</span>
            <span>Plan Professional</span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {metrics.map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-md border border-white/10 bg-white/10 p-4 text-white">
              <Icon className="mb-4 h-5 w-5 text-amber-200" />
              <div className="text-2xl font-semibold">{value}</div>
              <div className="text-xs text-white/70">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-md border border-white/10 bg-white/10 p-4">
            <div className="mb-3 flex items-center justify-between text-white">
              <span className="text-sm font-semibold">Live-Flotte</span>
              <Activity className="h-4 w-4 text-teal-300" />
            </div>
            <div className="grid gap-2">
              {rows.map((row) => (
                <div key={row[0]} className="grid grid-cols-4 rounded-md bg-white/10 px-3 py-2 text-xs text-white/80">
                  {row.map((cell) => (
                    <span key={cell}>{cell}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-md border border-white/10 bg-white/10 p-4 text-white">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <QrCode className="h-4 w-4 text-teal-300" />
                QR Workflow
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span key={index} className={index % 3 === 0 ? "h-6 bg-white" : "h-6 bg-white/30"} />
                ))}
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-white/10 p-4 text-white">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-amber-200" />
                Wartungskosten
              </div>
              <div className="flex h-20 items-end gap-2">
                {[36, 52, 44, 78, 62, 88, 58].map((height, index) => (
                  <span key={index} className="w-full rounded-sm bg-teal-300/80" style={{ height }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
