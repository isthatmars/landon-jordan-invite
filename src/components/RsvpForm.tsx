"use client";

import { FormEvent, useRef, useState } from "react";
import type { SiteContent } from "@/lib/types";
import { Reveal } from "./Reveal";

export function RsvpForm({ content }: { content: SiteContent }) {
  const draftId = useRef(`draft_${Math.random().toString(36).slice(2, 10)}`);
  const startedAt = useRef<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    attend: "yes",
    guestCount: 1,
    phone: "",
    email: "",
    specialRequests: "",
  });

  const markStarted = () => {
    if (!startedAt.current) startedAt.current = new Date().toISOString();
  };

  const saveDraft = async (field: string, next = form) => {
    markStarted();
    try {
      await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          id: draftId.current,
          ...next,
          lastFieldTouched: field,
          formStartedAt: startedAt.current,
        }),
      });
    } catch {
      // abandon tracking is best-effort
    }
  };

  const onBlurField = (field: string) => {
    void saveDraft(field);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftId.current,
          ...form,
          formStartedAt: startedAt.current || new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus("done");
      const stubbed = data?.notifications?.guestMail?.stubbed;
      setMessage(
        stubbed
          ? "You're on the list! Email stubbed until RESEND_API_KEY is set."
          : "You're on the list! Confirmation email sent (or queued via Resend).",
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <section id="rsvp" className="section-pad">
      <Reveal>
        <div className="neon-frame mx-auto max-w-5xl bg-black/50 p-6 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-neon-gold text-3xl mb-2" aria-hidden>
                ♛
              </p>
              <h2 className="neon-script-lg text-5xl sm:text-6xl mb-4">{content.rsvpHeadline}</h2>
              <p className="text-sm sm:text-base tracking-wide text-violet-100 leading-relaxed">
                {content.rsvpSubhead}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Full Name *">
                <input
                  required
                  className="input-dark"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  onFocus={markStarted}
                  onBlur={() => onBlurField("fullName")}
                  placeholder="Your name"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Will You Attend? *">
                  <select
                    className="input-dark"
                    value={form.attend}
                    onChange={(e) => setForm({ ...form, attend: e.target.value })}
                    onBlur={() => onBlurField("attend")}
                  >
                    <option value="yes">Yes, I&apos;ll be there!</option>
                    <option value="maybe">Maybe</option>
                    <option value="no">Can&apos;t make it</option>
                  </select>
                </Field>
                <Field label="Number of Guests (Including You)">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="input-dark"
                    value={form.guestCount}
                    onChange={(e) =>
                      setForm({ ...form, guestCount: Number(e.target.value) || 1 })
                    }
                    onBlur={() => onBlurField("guestCount")}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone Number">
                  <input
                    className="input-dark"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    onBlur={() => onBlurField("phone")}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Email Address *">
                  <input
                    required
                    type="email"
                    className="input-dark"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onBlur={() => onBlurField("email")}
                    placeholder="you@email.com"
                  />
                </Field>
              </div>
              <Field label="Any Special Requests or Dietary Needs?">
                <textarea
                  className="input-dark min-h-[96px]"
                  value={form.specialRequests}
                  onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                  onBlur={() => onBlurField("specialRequests")}
                />
              </Field>
              <button
                type="submit"
                disabled={status === "saving" || status === "done"}
                className="btn-green-solid w-full text-center"
              >
                {status === "saving" ? "SENDING…" : "SUBMIT RSVP →"}
              </button>
              {message && (
                <p
                  className={`text-sm ${status === "error" ? "text-red-400" : "text-neon-green"}`}
                  role="status"
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-muted">{label}</span>
      {children}
    </label>
  );
}
