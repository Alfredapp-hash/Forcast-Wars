"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/arena";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage(error.message);
    else window.location.href = redirectTo.startsWith("/") ? redirectTo : "/arena";
  };

  const handleSignup = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage("Check your email to confirm your account.");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      <div className="flex justify-center">
        <Logo size="md" href="/" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {message && <p className="text-sm text-amber-400">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              Sign In
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleSignup}
              disabled={loading}
            >
              Create Account
            </Button>
          </form>
          <p className="text-xs text-white/40 text-center mt-4">
            <Link href="/" className="hover:text-white">
              ← Back to arena
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
