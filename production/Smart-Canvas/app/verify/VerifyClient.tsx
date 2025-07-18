"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VerifyClient() {
  const [message, setMessage] = useState("Verifying...");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session);
    });
    supabase.auth.getUser().then(({ data, error }) => {
      if (data?.user) {
        setMessage("Email verified! You are now logged in.");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setMessage("Email verified! You can now log in.");
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-zinc-950">
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-5 px-8 py-10 items-center">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">{message}</h1>
      </div>
    </div>
  );
} 