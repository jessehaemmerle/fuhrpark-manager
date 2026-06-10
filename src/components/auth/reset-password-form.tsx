"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordSchema } from "@/lib/auth-validators";

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(token ? null : "Der Reset-Link ist ungueltig oder unvollstaendig.");
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" }
  });

  async function onSubmit(values: ResetPasswordValues) {
    setError(null);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Passwort konnte nicht zurueckgesetzt werden.");
      return;
    }
    window.location.assign(payload.redirectTo ?? "/dashboard");
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <input type="hidden" {...form.register("token")} />
      <div className="grid gap-2">
        <Label htmlFor="password">Neues Passwort</Label>
        <Input id="password" type="password" autoComplete="new-password" disabled={!token} {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Passwort bestaetigen</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" disabled={!token} {...form.register("confirmPassword")} />
        {form.formState.errors.confirmPassword ? (
          <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
        ) : null}
      </div>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <Button disabled={!token || form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Passwort speichern
      </Button>
    </form>
  );
}
