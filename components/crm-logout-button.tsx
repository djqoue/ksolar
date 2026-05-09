"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CrmLogoutButtonProps {
  label: string;
  pendingLabel: string;
}

export function CrmLogoutButton({ label, pendingLabel }: CrmLogoutButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {pending ? pendingLabel : label}
    </Button>
  );
}
