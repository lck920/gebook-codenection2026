import { useState } from "react";
import { X } from "lucide-react";
import { AuthForm, type AuthMode } from "@/features/auth";
import { useRouter } from "@/app/router";

export function AuthPage() {
  const { navigate } = useRouter();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const isSignUp = mode === "signUp";

  return (
    <div className="dark relative flex min-h-dvh flex-col bg-[#020D33] text-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Top Bar with Close X on left, SIGN UP / LOG IN button on right */}
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Close"
          className="flex size-10 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/10 hover:text-white active:scale-95"
        >
          <X className="size-6 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => setMode(isSignUp ? "signIn" : "signUp")}
          className="wf-tactile-btn flex items-center justify-center rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-xs transition-all hover:bg-white/10 hover:border-white/40 active:scale-95"
        >
          {isSignUp ? "LOG IN" : "SIGN UP"}
        </button>
      </header>

      {/* Main Centered Form Modal Container */}
      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm sm:max-w-[400px]">
          <AuthForm mode={mode} onModeChange={setMode} />
        </div>
      </main>
    </div>
  );
}
