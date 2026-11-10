"use client";

import { FormEvent, useRef, useState, type ReactNode } from "react";
import { MAX_COMPANIONS, parseCompletedRsvp } from "@/lib/rsvp";
import type { AttendStatus, PartyPerson, SiteContent } from "@/lib/types";
import { Reveal } from "./Reveal";

type YesNo = "" | "yes" | "no";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  attend: "" | AttendStatus;
  companions: PartyPerson[];
  dietary: YesNo;
  dietaryNotes: string;
  anythingElse: YesNo;
  specialRequests: string;
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  attend: "",
  companions: [],
  dietary: "",
  dietaryNotes: "",
  anythingElse: "",
  specialRequests: "",
};

export function RsvpForm({ content }: { content: SiteContent }) {
  const draftId = useRef(`draft_${Math.random().toString(36).slice(2, 10)}`);
  const startedAt = useRef<string | null>(null);
  const doneRef = useRef(false);
  const formRef = useRef<FormState>(emptyForm);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  formRef.current = form;

  const coming = form.attend === "yes" || form.attend === "maybe";
  const namedCompanions = form.companions.filter(
    (person) => person.firstName.trim() && person.lastName.trim(),
  );
  const headcount = form.attend === "no" ? 0 : coming ? 1 + namedCompanions.length : 0;

  const markStarted = () => {
    if (!startedAt.current) startedAt.current = new Date().toISOString();
  };

  const saveDraft = async (field: string, next = formRef.current) => {
    if (doneRef.current) return;
    markStarted();
    formRef.current = next;
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

  const update = (patch: Partial<FormState>) => {
    const next = { ...formRef.current, ...patch };
    formRef.current = next;
    setForm(next);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseCompletedRsvp(formRef.current);
    if (!parsed.ok) {
      setStatus("error");
      setMessage(parsed.error);
      return;
    }
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftId.current,
          ...parsed.value,
          formStartedAt: startedAt.current || new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      doneRef.current = true;
      setStatus("done");
      const count = Number(data?.rsvp?.guestCount ?? parsed.value.guestCount);
      const stubbed = data?.notifications?.guestMail?.stubbed;
      const mailed = stubbed
        ? " Confirmation email is logged until RESEND_API_KEY is set."
        : " Confirmation email sent.";
      setMessage(
        count === 0
          ? `Thanks for letting us know. Headcount for this RSVP is 0.${mailed}`
          : `You're on the list. Headcount: ${count}.${mailed}`,
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const addCompanion = () => {
    if (form.companions.length >= MAX_COMPANIONS) return;
    const next = {
      ...formRef.current,
      companions: [...formRef.current.companions, { firstName: "", lastName: "" }],
    };
    formRef.current = next;
    setForm(next);
    void saveDraft("companions", next);
  };

  const removeCompanion = (index: number) => {
    const next = {
      ...formRef.current,
      companions: formRef.current.companions.filter((_, i) => i !== index),
    };
    formRef.current = next;
    setForm(next);
    void saveDraft("companions", next);
  };

  return (
    <section id="rsvp" className="section-pad">
      <Reveal>
        <div className="neon-frame mx-auto max-w-5xl bg-black/50 p-5 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
            <div className="text-center lg:text-left">
              <p className="text-neon-gold mb-2 text-4xl sm:text-5xl" aria-hidden>
                ♛
              </p>
              <h2 className="neon-script-lg mb-4 text-6xl sm:text-7xl">{content.rsvpHeadline}</h2>
              <p className="text-sm tracking-wide text-violet-100 sm:text-base">
                {content.rsvpSubhead}
              </p>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-violet-100/90 lg:mx-0">
                Please register every adult and child. If a name isn&apos;t on this form, they
                can&apos;t come in.
              </p>
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="What's your first name? *">
                  <input
                    required
                    autoComplete="given-name"
                    className="input-dark"
                    value={form.firstName}
                    onChange={(e) => update({ firstName: e.target.value })}
                    onFocus={markStarted}
                    onBlur={() => void saveDraft("firstName")}
                  />
                </Field>
                <Field label="What's your last name? *">
                  <input
                    required
                    autoComplete="family-name"
                    className="input-dark"
                    value={form.lastName}
                    onChange={(e) => update({ lastName: e.target.value })}
                    onFocus={markStarted}
                    onBlur={() => void saveDraft("lastName")}
                  />
                </Field>
              </div>

              <Field label="Are you able to attend? *">
                <select
                  required
                  className="input-dark"
                  value={form.attend}
                  onChange={(e) => update({ attend: e.target.value as FormState["attend"] })}
                  onBlur={() => void saveDraft("attend")}
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes, I&apos;ll be there</option>
                  <option value="maybe">Maybe</option>
                  <option value="no">No, I can&apos;t make it</option>
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={coming ? "Phone number *" : "Phone number"}>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="input-dark"
                    value={form.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    onBlur={() => void saveDraft("phone")}
                    placeholder={coming ? "Required if you're coming" : "Optional if you can't make it"}
                  />
                </Field>
                <Field label="Email address *">
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    className="input-dark"
                    value={form.email}
                    onChange={(e) => update({ email: e.target.value })}
                    onBlur={() => void saveDraft("email")}
                    placeholder="you@email.com"
                  />
                </Field>
              </div>

              <Field label="Do you have dietary restrictions or food allergies? *">
                <select
                  required
                  className="input-dark"
                  value={form.dietary}
                  onChange={(e) => update({ dietary: e.target.value as YesNo })}
                  onBlur={() => void saveDraft("dietary")}
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
              {form.dietary === "yes" && (
                <Field label="Let us know here so we can get more food! *">
                  <textarea
                    required
                    className="input-dark min-h-[88px]"
                    value={form.dietaryNotes}
                    onChange={(e) => update({ dietaryNotes: e.target.value })}
                    onBlur={() => void saveDraft("dietaryNotes")}
                    placeholder="Allergies, no pork, vegetarian…"
                  />
                </Field>
              )}

              <Field label="Anything else you'd like to let us know? *">
                <select
                  required
                  className="input-dark"
                  value={form.anythingElse}
                  onChange={(e) => update({ anythingElse: e.target.value as YesNo })}
                  onBlur={() => void saveDraft("anythingElse")}
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
              {form.anythingElse === "yes" && (
                <Field label="Provide any additional information about your attendance *">
                  <textarea
                    required
                    className="input-dark min-h-[88px]"
                    value={form.specialRequests}
                    onChange={(e) => update({ specialRequests: e.target.value })}
                    onBlur={() => void saveDraft("specialRequests")}
                  />
                </Field>
              )}

              <fieldset className="space-y-3 rounded-2xl border border-pink-500/30 p-4">
                <legend className="px-2 text-xs tracking-[0.14em] text-violet-200 uppercase">
                  Other people coming with you
                </legend>
                <p className="text-sm leading-relaxed text-violet-100">
                  Do you need to register anyone else? Add a row for every adult and child.
                  First and last name, both required.
                </p>
                {form.companions.map((person, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                  >
                    <Field label={`Guest ${index + 2} first name *`}>
                      <input
                        className="input-dark"
                        autoComplete="given-name"
                        value={person.firstName}
                        onChange={(e) => {
                          const companions = formRef.current.companions.map((row, i) =>
                            i === index ? { ...row, firstName: e.target.value } : row,
                          );
                          update({ companions });
                        }}
                        onBlur={() => void saveDraft("companions")}
                      />
                    </Field>
                    <Field label={`Guest ${index + 2} last name *`}>
                      <input
                        className="input-dark"
                        autoComplete="family-name"
                        value={person.lastName}
                        onChange={(e) => {
                          const companions = formRef.current.companions.map((row, i) =>
                            i === index ? { ...row, lastName: e.target.value } : row,
                          );
                          update({ companions });
                        }}
                        onBlur={() => void saveDraft("companions")}
                      />
                    </Field>
                    <button
                      type="button"
                      className="btn-pink-outline px-3 py-2 text-xs"
                      onClick={() => removeCompanion(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-pink-outline w-full text-xs tracking-widest sm:w-auto"
                  onClick={addCompanion}
                  disabled={form.companions.length >= MAX_COMPANIONS}
                >
                  Register someone else
                </button>
                {form.companions.length >= MAX_COMPANIONS && (
                  <p className="text-xs text-amber-200">
                    That&apos;s the limit on this form ({MAX_COMPANIONS} additional names).
                  </p>
                )}
                <p className="text-sm text-neon-teal" data-testid="headcount">
                  {form.attend === "no"
                    ? "Headcount: 0. You're marked as not attending, so nobody from this form is on the door list."
                    : coming
                      ? `Headcount: ${headcount}. ${headcount === 1 ? "Just you so far." : `${headcount} named people on the door list.`}`
                      : "Headcount shows up once you tell us if you can attend."}
                </p>
              </fieldset>

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
                  role={status === "error" ? "alert" : "status"}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-muted">{label}</span>
      {children}
    </label>
  );
}
