"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface AuthSubmitButtonProps extends ButtonProps {
  pendingLabel: string;
}

export function AuthSubmitButton({ children, pendingLabel, disabled, ...props }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
