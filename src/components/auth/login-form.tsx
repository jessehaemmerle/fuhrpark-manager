"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/auth-validators";

type LoginValues = z.infer<typeof loginSchema>;

function redirectTarget(fallback = "/dashboard", ignoreNext = false) {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!ignoreNext && next?.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [code, setCode] = useState("");
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  async function onSubmit(values: LoginValues) {
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(twoFactorRequired ? { ...values, code } : values)
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.twoFactorRequired && !payload.error) {
        setTwoFactorRequired(true);
        return;
      }
      if (!response.ok) {
        if (payload.twoFactorRequired) setTwoFactorRequired(true);
        setError(payload.error ?? "Login fehlgeschlagen.");
        return;
      }
      window.location.assign(redirectTarget(payload.redirectTo ?? "/dashboard", Boolean(payload.mustChangePassword)));
    } catch {
      setError("Login fehlgeschlagen. Bitte Verbindung pruefen und erneut versuchen.");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="text-sm text-red-600">{form.formState.errors.email.message}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Passwort</Label>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      {twoFactorRequired ? (
        <div className="grid gap-2">
          <Label htmlFor="code">Authenticator-Code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-stelliger Code oder Recovery-Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Code aus Ihrer Authenticator-App oder ein Recovery-Code.</p>
        </div>
      ) : null}
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <Button disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Einloggen
      </Button>
    </form>
  );
}
