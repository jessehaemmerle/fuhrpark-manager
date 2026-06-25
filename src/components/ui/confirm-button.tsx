"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type Props = ComponentProps<typeof Button> & { message: string };

export function ConfirmButton({ message, onClick, ...props }: Props) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
