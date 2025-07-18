"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function ClientResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access_token") || searchParams.get("token");

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      setMessage("Password updated! You can now log in.");
      setTimeout(() => router.push("/login"), 2000);
    }
    setLoading(false);
  }

  if (!accessToken) {
    return <div className="min-h-screen flex items-center justify-center text-white">Invalid or missing token.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-zinc-950">
      <form
        className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-5 px-8 py-10"
        onSubmit={handleReset}
      >
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Reset Password</h1>
        {message && <div className="text-sm text-center bg-zinc-800/70 rounded-md py-2 px-3 mb-2 animate-fade-in text-white">{message}</div>}
        <input
          type="password"
          placeholder="New password"
          minLength={8}
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition placeholder-zinc-500 text-base"
        />
        <button
          type="submit"
          className="w-full bg-primary text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-base"
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ClientResetPasswordForm />
    </Suspense>
  );
} 