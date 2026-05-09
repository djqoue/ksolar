"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LANGUAGE_OPTIONS, LOCALE_COOKIE_NAME, type AppLocale } from "@/lib/i18n";

interface LanguageSwitcherProps {
  locale: AppLocale;
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1.5">
      {LANGUAGE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={locale === option.value ? "default" : "outline"}
          size="sm"
          className="px-2.5 sm:px-3.5"
          onClick={() => {
            document.cookie = `${LOCALE_COOKIE_NAME}=${option.value}; path=/; max-age=31536000; SameSite=Lax`;
            startTransition(() => {
              router.refresh();
            });
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
