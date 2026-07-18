"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="ksolar-shell grid min-h-screen place-items-center px-4 py-8">
      <section className="premium-panel w-full max-w-lg p-8 text-center sm:p-10" role="alert">
        <CircleAlert className="mx-auto size-9 text-red-600" aria-hidden="true" />
        <p className="section-kicker mt-5">页面错误</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">页面暂时无法打开</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          你的资料不会因为这个页面错误而自动提交。请重试，或返回报价首页。
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset}>
            重试
          </Button>
          <Button asChild variant="outline">
            <Link href="/">返回报价首页</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
