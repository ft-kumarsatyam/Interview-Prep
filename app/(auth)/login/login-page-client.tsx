"use client";

import dynamic from "next/dynamic";

const LoginView = dynamic(() => import("./login-view"), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="h-80 w-full max-w-sm animate-pulse rounded-xl bg-muted" aria-hidden />
    </main>
  ),
});

export function LoginPageClient() {
  return <LoginView />;
}
