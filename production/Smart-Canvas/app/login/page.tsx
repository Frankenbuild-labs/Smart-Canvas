"use client"

import { useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

export default function LoginPage() {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState<'login' | 'signup' | 'google' | 'reset' | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [resetEmail, setResetEmail] = useState("")
  const [email, setEmail] = useState("")

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading('login');
    setMessage("");
    const formData = new FormData(formRef.current!);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else window.location.href = '/dashboard';
    setLoading(null);
  }

  async function handleSignup() {
    setLoading('signup');
    setMessage("");
    const formData = new FormData(formRef.current!);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://agent-flow-sigma.vercel.app' } });
    if (error) setMessage(error.message);
    else setMessage("Check your email for a confirmation link before logging in.");
    setLoading(null);
  }

  async function handleGoogleLogin() {
    setLoading('google')
    setMessage("")
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
    if (error) setMessage(error.message)
    setLoading(null)
  }

  async function handleResetPassword() {
    setLoading('reset');
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: 'https://agent-flow-sigma.vercel.app/reset-password' });
    if (error) setMessage(error.message);
    else setMessage("Check your email for a password reset link.");
    setLoading(null);
    setResetEmail("");
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading('login');
    setMessage("");
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${siteUrl}/verify`,
      },
    });
    if (error) setMessage(error.message);
    else setMessage("Check your email for a magic link to log in.");
    setLoading(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-zinc-950">
      <div className="flex flex-col items-center w-full">
        <div className="mb-8 flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-2xl text-white shadow-lg">A</div>
          <span className="text-2xl font-bold text-white tracking-tight">AgentFlow</span>
        </div>
        <form
          className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-5 px-8 py-10"
          onSubmit={handleMagicLink}
        >
          <h1 className="text-3xl font-bold text-white mb-1 text-center">Sign in with Magic Link</h1>
          <div className="text-zinc-400 text-center mb-2">Enter your email to receive a magic link</div>
          {message && <div className="text-sm text-center bg-zinc-800/70 rounded-md py-2 px-3 mb-2 animate-fade-in text-white">{message}</div>}
          <input
            type="email"
            placeholder="Your email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition placeholder-zinc-500 text-base"
          />
          <button
            type="submit"
            className="w-full bg-primary text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-primary/80 hover:scale-105 hover:shadow-xl transition text-base cursor-pointer"
            disabled={loading === 'login'}
          >
            {loading === 'login' ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
      </div>
    </div>
  )
} 