"use client";

import { useEffect } from "react";

export function RecoveryCodesNotice({ codes }: { codes: string[] }) {
  useEffect(() => {
    // One-time display: clear the transient cookie so the codes do not reappear.
    document.cookie = "fb_recovery_codes=; path=/settings; max-age=0";
  }, []);

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-amber-900">Recovery-Codes – jetzt sicher speichern</p>
      <p className="mt-1 text-amber-800">
        Diese Codes werden nur einmal angezeigt. Mit einem Code können Sie sich einloggen, falls Sie keinen Zugriff auf
        Ihre Authenticator-App haben. Jeder Code ist nur einmal gültig.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="rounded bg-white px-2 py-1 text-center">
            {code}
          </li>
        ))}
      </ul>
    </div>
  );
}
