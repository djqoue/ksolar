import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main className="ksolar-shell grid min-h-screen place-items-center px-4 py-8">
      <section
        className="premium-panel w-full max-w-lg p-8 text-center sm:p-10"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <LoaderCircle className="mx-auto size-8 animate-spin text-emerald-600" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">正在加载工作台</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">请稍候，报价资料正在准备中。</p>
      </section>
    </main>
  );
}
