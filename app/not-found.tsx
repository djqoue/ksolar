import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="ksolar-shell grid min-h-screen place-items-center px-4 py-8">
      <section className="premium-panel w-full max-w-lg p-8 text-center sm:p-10">
        <SearchX className="mx-auto size-9 text-slate-700" aria-hidden="true" />
        <p className="section-kicker mt-5">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">找不到这个页面</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          链接可能已经失效，或者页面地址有误。你可以返回报价首页继续工作。
        </p>
        <Button asChild className="mt-7">
          <Link href="/">返回报价首页</Link>
        </Button>
      </section>
    </main>
  );
}
