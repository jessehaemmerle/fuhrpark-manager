"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const payload = await response.json();
    window.location.href = payload.redirectTo ?? "/";
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={logout}>
      <LogOut className="h-4 w-4" aria-hidden />
      Logout
    </Button>
  );
}
