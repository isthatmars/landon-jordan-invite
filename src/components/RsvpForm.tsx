"use client";

import { FormEvent, useRef, useState, type ReactNode } from "react";
import { MAX_COMPANIONS, parseCompletedRsvp } from "@/lib/rsvp";
import type { PartyPerson, SiteContent } from "@/lib/types";
import { Crown } from "./icons";
import { RsvpTelephone } from "./RsvpTelephone";

type YesNo = "" | "yes" | "no";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  attend: "" | "yes" | "no";
  bringingChildren: YesNo;
  companions: PartyPerson[];
  dietaryNotes: string;
  specialRequests: string;
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  attend: "",
  bringingChildren: "",
  companions: [],
  dietaryNotes: "",
  specialRequests: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneDigits(phone: string): number {
  return phone.replace(/\D/g, "").length;
}

/** Shape the API expects. Decline never carries contact, diet, or companions. */
function completedFrom(form: FormState) {
  const attending = form.attend === "yes";
  const notes = form.dietaryNotes.trim();
  const message = form.specialRequests.trim();
  const kids =
    attending && form.bringingChildren === "yes"
      ? form.companions
          .map((person) => ({
            firstName: person.firstName.trim(),
            lastName: person.lastName.trim(),
          }))
          .filter((person) => person.firstName || person.lastName)
      : [];
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    email: attending ? form.email.trim() : "",
    phone: attending ? form.phone.trim() : "",
    attend: attending ? ("yes" as const) : ("no" as const),
    companions: attending ? kids : [],
    dietary: attending && notes ? ("yes" as const) : ("no" as const),
    dietaryNotes: attending && notes ? notes : "",
    anythingElse: !attending && message ? ("yes" as const) : ("no" as const),
    specialRequests: !attending && message ? message : "",
  };
}

function detailError(form: FormState): string {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    return "Add your first and last name.";
  }
  if (form.attend === "yes") {
    if (!EMAIL_RE.test(form.email.trim())) {
      return "Add an email address so we can confirm your RSVP.";
    }
    const digits = phoneDigits(form.phone);
    if (form.phone.trim() && digits >= 1 && digits <= 6) {
      return "Enter a full phone number, or leave it blank.";
    }
    if (form.phone.trim() && digits < 7) {
      return "Enter a full phone number, or leave it blank.";
    }
    if (form.bringingChildren !== "yes" && form.bringingChildren !== "no") {
      return "Let us know if you're bringing children.";
    }
    if (form.bringingChildren === "yes") {
      if (form.companions.length === 0) {
        return "Add each child with a first and last name.";
      }
      const incomplete = form.companions.some(
        (person) => !person.firstName.trim() || !person.lastName.trim(),
      );
      if (incomplete) return "Every child needs a first and last name.";
    }
  }
  return "";
}

export function RsvpForm({ content }: { content: SiteContent }) {
  const draftId = useRef(`draft_${Math.random().toString(36).slice(2, 10)}`);
  const startedAt = useRef<string | null>(null);
  const doneRef = useRef(false);
  const savingRef = useRef(false);
  const formRef = useRef<FormState>(emptyForm);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState("");
  formRef.current = form;

  const attending = form.attend === "yes";
  const namedKids =
    attending && form.bringingChildren === "yes"
      ? form.companions.filter((person) => person.firstName.trim() && person.lastName.trim())
      : [];
  const headcount = attending ? 1 + namedKids.length : 0;

  const markStarted = () => {
    if (!startedAt.current) startedAt.current = new Date().toISOString();
  };

  const saveDraft = async (field: string, next = formRef.current) => {
    if (doneRef.current) return;
    markStarted();
    formRef.current = next;
    const snapshot = completedFrom({ ...next, attend: next.attend || "yes" });
    try {
      await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          id: draftId.current,
          ...snapshot,
          attend: next.attend || snapshot.attend,
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

  const chooseAttend = (attend: "yes" | "no") => {
    setStepError("");
    const next: FormState = { ...formRef.current, attend };
    formRef.current = next;
    setForm(next);
    setStep(2);
    void saveDraft("attend", next);
  };

  const chooseChildren = (bringingChildren: YesNo) => {
    const current = formRef.current;
    const companions =
      bringingChildren === "yes" && current.companions.length === 0
        ? [{ firstName: "", lastName: "" }]
        : current.companions;
    const next = { ...current, bringingChildren, companions };
    formRef.current = next;
    setForm(next);
    void saveDraft("companions", next);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (savingRef.current || doneRef.current || status === "saving" || status === "done") return;
    if (step !== 3) {
      goNext();
      return;
    }
    const parsed = parseCompletedRsvp(completedFrom(formRef.current));
    if (!parsed.ok) {
      setStatus("error");
      setMessage(parsed.error);
      return;
    }
    savingRef.current = true;
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
      const mailed = !parsed.value.email
        ? ""
        : data?.notifications?.guestMail?.stubbed
          ? " Confirmation email is logged until RESEND_API_KEY is set."
          : " Confirmation email sent.";
      setMessage(
        count === 0
          ? `Thanks for letting us know. Headcount for this RSVP is 0.${mailed}`
          : `You're on the list. Headcount: ${count}.${mailed}`,
      );
    } catch (err) {
      savingRef.current = false;
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const goNext = () => {
    const current = formRef.current;
    setStepError("");
    if (step === 1) {
      if (current.attend !== "yes" && current.attend !== "no") {
        setStepError("Let us know if you are able to attend.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const problem = detailError(current);
      if (problem) {
        setStepError(problem);
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    setStepError("");
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

  const setCompanion = (index: number, key: "firstName" | "lastName", value: string) => {
    const companions = formRef.current.companions.map((row, i) =>
      i === index ? { ...row, [key]: value } : row,
    );
    update({ companions });
  };

  return (
    <section id="rsvp" className="bg-[#07010f] px-3 pb-6 pt-2 sm:px-5">
      <div className="neon-frame mx-auto max-w-[1100px] bg-[#0b0615ee] p-4 sm:p-8 md:p-10">
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] md:gap-8 lg:gap-12">
          <div className="pt-2 text-center md:pt-6">
            <Crown className="icon-shake mx-auto h-10 w-14 drop-shadow-[0_0_12px_#ffc44d] sm:h-12 sm:w-16" />
            <h2 className="neon-script-lg rsvp-title text-6xl sm:text-7xl">{content.rsvpHeadline}</h2>
            <p className="font-nav mx-auto mt-3 max-w-[17rem] text-[11px] leading-relaxed text-[#f8f4fa]/85">
              {content.rsvpSubhead}
            </p>
            <RsvpTelephone />
          </div>

          <form id="rsvp-form" data-step={step} onSubmit={onSubmit} noValidate className="rsvp-steps space-y-4">
            <div className="rsvp-step rsvp-step-1 space-y-4">
              <p className="rsvp-ask">Are you able to attend?</p>
              <div id="rsvp-attend" data-testid="rsvp-attend" className="grid gap-3">
                <ChoiceButton
                  tone="yes"
                  pressed={form.attend === "yes"}
                  testId="rsvp-choice-yes"
                  onClick={() => chooseAttend("yes")}
                >
                  Yes I&apos;ll be there
                </ChoiceButton>
                <ChoiceButton
                  tone="no"
                  pressed={form.attend === "no"}
                  testId="rsvp-choice-no"
                  onClick={() => chooseAttend("no")}
                >
                  Sorry I can&apos;t
                </ChoiceButton>
              </div>
            </div>

            {/* Mount later steps only when active so autofill/focus can't scroll to #rsvp-first on load. */}
            <div className="rsvp-step rsvp-step-2 space-y-4">
              {step === 2 && attending ? (
                <div data-testid="rsvp-attending" className="space-y-4">
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
                    <Field label="Phone number">
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        className="input-dark"
                        value={form.phone}
                        onChange={(e) => update({ phone: e.target.value })}
                        onBlur={() => void saveDraft("phone")}
                        placeholder="Optional"
                      />
                    </Field>
                  </div>
                  <Field label="Dietary restrictions or food allergies">
                    <textarea
                      className="input-dark min-h-[88px]"
                      value={form.dietaryNotes}
                      onChange={(e) => update({ dietaryNotes: e.target.value })}
                      onBlur={() => void saveDraft("dietaryNotes")}
                      placeholder="Optional — allergies, no pork, vegetarian…"
                    />
                  </Field>
                  <fieldset className="space-y-3">
                    <legend className="mb-2 text-[15px] text-white/80">Are you bringing children? *</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <ChoiceButton
                        tone="yes"
                        pressed={form.bringingChildren === "yes"}
                        testId="rsvp-children-yes"
                        onClick={() => chooseChildren("yes")}
                      >
                        Yes
                      </ChoiceButton>
                      <ChoiceButton
                        tone="no"
                        pressed={form.bringingChildren === "no"}
                        testId="rsvp-children-no"
                        onClick={() => chooseChildren("no")}
                      >
                        No
                      </ChoiceButton>
                    </div>
                    {form.bringingChildren === "yes" && (
                      <div data-testid="rsvp-children" className="space-y-3 pt-2">
                        <p className="text-sm leading-relaxed text-violet-100">
                          Add a first and last name for each child.
                        </p>
                        {form.companions.map((person, index) => (
                          <div
                            key={index}
                            className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                          >
                            <Field label={`Child ${index + 1} first name *`}>
                              <input
                                className="input-dark"
                                autoComplete="given-name"
                                value={person.firstName}
                                onChange={(e) => setCompanion(index, "firstName", e.target.value)}
                                onBlur={() => void saveDraft("companions")}
                              />
                            </Field>
                            <Field label={`Child ${index + 1} last name *`}>
                              <input
                                className="input-dark"
                                autoComplete="family-name"
                                value={person.lastName}
                                onChange={(e) => setCompanion(index, "lastName", e.target.value)}
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
                          Add a child
                        </button>
                        {form.companions.length >= MAX_COMPANIONS && (
                          <p className="text-xs text-amber-200">
                            That&apos;s the limit on this form ({MAX_COMPANIONS} children).
                          </p>
                        )}
                      </div>
                    )}
                  </fieldset>
                </div>
              ) : null}
              {step === 2 && !attending ? (
                <div data-testid="rsvp-declining" className="space-y-4">
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
                  <Field label="A note for Landon and Jordan">
                    <textarea
                      className="input-dark min-h-[88px]"
                      value={form.specialRequests}
                      onChange={(e) => update({ specialRequests: e.target.value })}
                      onBlur={() => void saveDraft("specialRequests")}
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              ) : null}
              {step === 2 ? <StepNav onBack={goBack} onNext={goNext} nextLabel="Review" /> : null}
            </div>

            <div className="rsvp-step rsvp-step-3 space-y-4">
              {step === 3 ? (
                <>
                  <div
                    className="rsvp-summary space-y-2 rounded-2xl border border-white/15 p-4 text-[15px] leading-relaxed text-white"
                    data-testid="rsvp-summary"
                  >
                    <p className="font-nav text-[13px] tracking-[0.16em] text-[#c6ff00]">Your RSVP</p>
                    <p>
                      {form.firstName} {form.lastName}
                    </p>
                    {attending ? (
                      <>
                        <p>{form.email}</p>
                        {form.phone.trim() ? <p>{form.phone}</p> : null}
                        <p>Attending</p>
                        <p>
                          {form.dietaryNotes.trim()
                            ? `Dietary: ${form.dietaryNotes.trim()}`
                            : "No dietary restrictions."}
                        </p>
                        <p data-testid="headcount">
                          Headcount: {headcount}.{" "}
                          {namedKids.length
                            ? `Children: ${namedKids.map((person) => `${person.firstName.trim()} ${person.lastName.trim()}`).join(", ")}.`
                            : "No children on this RSVP."}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>Can&apos;t make it</p>
                        {form.specialRequests.trim() ? <p>Note: {form.specialRequests.trim()}</p> : null}
                        <p data-testid="headcount">Headcount: 0.</p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <button type="button" className="rsvp-back btn-pink-outline min-h-12 text-base" onClick={goBack}>
                      Back
                    </button>
                    <button
                      type="submit"
                      data-testid="rsvp-submit"
                      disabled={status === "saving" || status === "done"}
                      className="btn-green-solid w-full text-center"
                    >
                      {status === "saving" ? "SENDING…" : "SUBMIT RSVP →"}
                    </button>
                  </div>
                </>
              ) : null}
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

function ChoiceButton({
  pressed,
  onClick,
  children,
  testId,
  tone,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  tone: "yes" | "no";
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={`keycap ${tone === "yes" ? "keycap-yes" : "keycap-no"}${pressed ? " is-down" : ""}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
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
}: {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="rsvp-next flex gap-3">
      {onBack ? (
        <button type="button" className="btn-pink-outline min-h-12 flex-1 text-base" onClick={onBack}>
          Back
        </button>
      ) : null}
      <button type="button" className="btn-green-solid min-h-12 flex-1 text-center text-base" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}
