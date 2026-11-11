"use client";

import { FormEvent, useState } from "react";

export function AdminLogin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid code");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="admin-panel p-8">
        <p className="text-center text-neon-gold text-2xl mb-2">♛</p>
        <h1 className="neon-script-lg text-center text-4xl mb-2">Hi Ms. Kathy!</h1>
        <p className="text-center text-sm text-violet-300 mb-6">
          Enter your access code to open the control room — RSVPs, invite wording, music, and emails.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="label-muted">Access code</span>
            <input
              className="input-dark tracking-[0.3em] text-center uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="btn-green-solid w-full" disabled={loading}>
            {loading ? "UNLOCKING…" : "ENTER →"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
        <p className="mt-6 text-[11px] text-violet-400 text-center">
          Use the access code you were given for the party.
        </p>
        <p className="mt-3 text-center">
          <a href="/" className="text-xs text-neon-pink hover:underline">
            ← Back to invite
          </a>
        </p>
      </div>
    </div>
  );
}
