"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CrmLogoutButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {pending ? "退出中..." : "退出登录"}
    </Button>
  );
}
