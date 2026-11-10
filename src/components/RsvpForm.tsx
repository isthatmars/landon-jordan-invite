"use client";

import { FormEvent, useRef, useState, type ReactNode } from "react";
import { MAX_COMPANIONS, parseCompletedRsvp } from "@/lib/rsvp";
import type { AttendStatus, PartyPerson, SiteContent } from "@/lib/types";
import { Crown } from "./icons";
import { RsvpTelephone } from "./RsvpTelephone";

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
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState("");
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

  const goNext = () => {
    const current = formRef.current;
    const attending = current.attend === "yes" || current.attend === "maybe";
    setStepError("");
    if (step === 1) {
      if (!current.attend) {
        setStepError("Let us know if you are able to attend.");
        return;
      }
      if (!attending) {
        const next = {
          ...current,
          dietary: current.dietary || "no",
          anythingElse: current.anythingElse || "no",
          companions: [] as PartyPerson[],
        };
        formRef.current = next;
        setForm(next);
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!current.firstName.trim() || !current.lastName.trim()) {
        setStepError("Add your first and last name.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email.trim())) {
        setStepError("Add an email address so we can confirm your RSVP.");
        return;
      }
      if (attending && current.phone.replace(/\D/g, "").length < 7) {
        setStepError("Add a phone number so we can reach you if you're coming.");
        return;
      }
      setStep(attending ? 3 : 4);
      return;
    }
    if (step === 3) {
      if (!current.dietary) {
        setStepError("Let us know if anyone has dietary restrictions or food allergies.");
        return;
      }
      if (current.dietary === "yes" && !current.dietaryNotes.trim()) {
        setStepError("Tell us the dietary restrictions so we can get more food.");
        return;
      }
      if (!current.anythingElse) {
        setStepError("Let us know if there's anything else.");
        return;
      }
      if (current.anythingElse === "yes" && !current.specialRequests.trim()) {
        setStepError("Add a note so we know what else to plan for.");
        return;
      }
      const incomplete = current.companions.some(
        (person) =>
          (person.firstName.trim() && !person.lastName.trim()) ||
          (!person.firstName.trim() && person.lastName.trim()),
      );
      if (incomplete) {
        setStepError("Every adult and child needs a first and last name.");
        return;
      }
      setStep(4);
    }
  };

  const goBack = () => {
    setStepError("");
    const attending = formRef.current.attend === "yes" || formRef.current.attend === "maybe";
    if (step === 4 && !attending) {
      setStep(2);
      return;
    }
    setStep((value) => Math.max(1, value - 1));
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
    <section id="rsvp" className="bg-[#07010f] px-3 pb-6 pt-2 sm:px-5">
        <div className="neon-frame mx-auto max-w-[1100px] bg-[#0b0615ee] p-4 sm:p-8 md:p-10">
          <div className="grid items-start gap-6 md:grid-cols-[0.7fr_1.3fr] md:gap-10">
            <div className="pt-2 text-center md:pt-8">
              <Crown className="mx-auto h-10 w-14 drop-shadow-[0_0_12px_#ffc44d] sm:h-12 sm:w-16" />
              <h2 className="neon-script-lg text-6xl leading-none sm:text-7xl">{content.rsvpHeadline}</h2>
              <p className="font-nav mx-auto mt-3 max-w-[17rem] text-[11px] leading-relaxed text-[#f8f4fa]/85">
                {content.rsvpSubhead}
              </p>
              <RsvpTelephone />
            </div>

            <form id="rsvp-form" data-step={step} onSubmit={onSubmit} noValidate className="rsvp-steps space-y-4">
              <div className="rsvp-step rsvp-step-1 space-y-4">
                <p className="rsvp-mobile-copy font-nav text-center text-[15px] tracking-[0.14em] text-white">
                  Will you attend?
                </p>
                <div className="rsvp-attend-picks grid grid-cols-3 gap-2">
                  {(
                    [
                      ["yes", "Yes"],
                      ["maybe", "Maybe"],
                      ["no", "No"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`min-h-12 rounded-full border-2 px-2 text-base font-bold tracking-[0.08em] ${
                        form.attend === value
                          ? "border-[#c6ff00] bg-[#c6ff00] text-black"
                          : "border-[#ff39c8] bg-[#09060f] text-white"
                      }`}
                      aria-pressed={form.attend === value}
                      onClick={() => {
                        update({ attend: value });
                        void saveDraft("attend", { ...formRef.current, attend: value });
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="rsvp-attend-select-wrap">
                <Field label="Are you able to attend? *">
                  <select
                    required
                    className="input-dark rsvp-attend-select"
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
                </div>
                <StepNav onNext={goNext} disabled={!form.attend} />
              </div>

              <div className="rsvp-step rsvp-step-2 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="What's your first name? *">
                  <input
                    id="rsvp-first"
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
              <StepNav onBack={goBack} onNext={goNext} />
              </div>

              <div className="rsvp-step rsvp-step-3 space-y-4">
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

              <fieldset className="space-y-3 border-t border-white/15 pt-4">
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
              <StepNav onBack={goBack} onNext={goNext} nextLabel="Review" />
              </div>

              <div className="rsvp-step rsvp-step-4 space-y-4">
                <div className="rsvp-summary space-y-2 rounded-2xl border border-white/15 p-4 text-[15px] leading-relaxed text-white">
                  <p className="font-nav text-[13px] tracking-[0.16em] text-[#c6ff00]">Your RSVP</p>
                  <p>
                    {form.firstName} {form.lastName}
                  </p>
                  <p>{form.email}</p>
                  {form.phone ? <p>{form.phone}</p> : null}
                  <p>
                    {form.attend === "yes"
                      ? "Attending"
                      : form.attend === "maybe"
                        ? "Maybe"
                        : "Can't make it"}
                  </p>
                  {coming && (
                    <p>
                      Headcount: {headcount}.{" "}
                      {namedCompanions.length
                        ? `Also coming: ${namedCompanions.map((person) => `${person.firstName} ${person.lastName}`).join(", ")}.`
                        : "No additional guests."}
                    </p>
                  )}
                  {coming && form.dietary === "yes" ? <p>Dietary: {form.dietaryNotes}</p> : null}
                  {coming && form.anythingElse === "yes" ? <p>Note: {form.specialRequests}</p> : null}
                </div>
                <div className="flex flex-col gap-3">
                  <button type="button" className="rsvp-back btn-pink-outline min-h-12 text-base" onClick={goBack}>
                    Back / Edit
                  </button>
                  <button
                    type="submit"
                    disabled={status === "saving" || status === "done"}
                    className="btn-green-solid w-full text-center"
                  >
                    {status === "saving" ? "SENDING…" : "SUBMIT RSVP →"}
                  </button>
                </div>
              </div>
              {stepError ? (
                <p className="text-sm text-red-400" role="alert">
                  {stepError}
                </p>
              ) : null}
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
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] text-white/80">{label}</span>
      {children}
    </label>
  );
}

function StepNav({
  onNext,
  onBack,
  nextLabel = "Continue",
  disabled = false,
}: {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="rsvp-next flex gap-3">
      {onBack ? (
        <button type="button" className="btn-pink-outline min-h-12 flex-1 text-base" onClick={onBack}>
          Back
        </button>
      ) : null}
      <button
        type="button"
        className="btn-green-solid min-h-12 flex-1 text-center text-base disabled:cursor-not-allowed disabled:opacity-45"
        onClick={onNext}
        disabled={disabled}
      >
        {nextLabel}
      </button>
    </div>
  );
}
