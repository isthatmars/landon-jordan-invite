"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMAIL_TEMPLATES,
  type EmailTemplate,
  type EmailTemplateId,
} from "@/lib/email";
import { TAPE_SPINE_PALETTE } from "@/lib/defaults";
import { partyHeadcount } from "@/lib/rsvp";
import { extractYoutubeId, watchUrl, youtubePosterUrl } from "@/lib/youtube";
import type {
  MessageLog,
  ReminderLog,
  RsvpRecord,
  SiteContent,
  Track,
  VideoItem,
} from "@/lib/types";

type Tab = "rsvps" | "content" | "tracks" | "videos" | "email" | "reminders";

const TABS: {
  id: Tab;
  label: string;
  explainer: string;
}[] = [
  {
    id: "rsvps",
    label: "RSVPs",
    explainer:
      "See who said yes, maybe, or can’t make it. Change someone’s status or resend their confirmation email.",
  },
  {
    id: "content",
    label: "Content",
    explainer:
      "Edit the words on the invite — date, place, dress code, headlines. Save when you’re happy.",
  },
  {
    id: "tracks",
    label: "Mixtape",
    explainer:
      "Add or update the songs that play on the invite. Artist, title, and the audio file path.",
  },
  {
    id: "videos",
    label: "Videos",
    explainer:
      "Manage the music videos guests can watch — titles, artists, and links or posters.",
  },
  {
    id: "email",
    label: "Email",
    explainer:
      "Write a friendly note and email guests — everyone, just the ones coming, or people you checked in RSVPs.",
  },
  {
    id: "reminders",
    label: "Reminders",
    explainer:
      "Browse the ready-made emails (party reminder, incomplete RSVPs, and more). Preview one, then send when you’re ready.",
  },
];

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("rsvps");
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [abandoned, setAbandoned] = useState<RsvpRecord[]>([]);
  const [emailLive, setEmailLive] = useState(false);
  const [emailNote, setEmailNote] = useState("");
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState<"ok" | "warn">("ok");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [pickedTemplate, setPickedTemplate] =
    useState<EmailTemplateId>("party_reminder");

  const flash = (msg: string, tone: "ok" | "warn" = "ok") => {
    setToastTone(tone);
    setToast(msg);
    setTimeout(() => setToast(""), 5200);
  };

  const load = useCallback(async () => {
    const [r, c, t, v, m, rem] = await Promise.all([
      fetch("/api/admin/rsvps").then((x) => x.json()),
      fetch("/api/admin/content").then((x) => x.json()),
      fetch("/api/admin/tracks").then((x) => x.json()),
      fetch("/api/admin/videos").then((x) => x.json()),
      fetch("/api/admin/messages").then((x) => x.json()),
      fetch("/api/admin/reminders").then((x) => x.json()),
    ]);
    setRsvps(r.rsvps || []);
    setContent(c.content || null);
    setTracks(t.tracks || []);
    setVideos(v.videos || []);
    setMessages(m.messages || []);
    setEmailLive(Boolean(m.emailLive));
    setEmailNote(typeof m.emailNote === "string" ? m.emailNote : "");
    setReminders(rem.reminders || []);
    setAbandoned(rem.abandoned || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTemplate: EmailTemplate = useMemo(
    () => EMAIL_TEMPLATES.find((t: EmailTemplate) => t.id === pickedTemplate) || EMAIL_TEMPLATES[0],
    [pickedTemplate],
  );

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
  };

  const patchRsvp = async (id: string, status: string) => {
    const res = await fetch("/api/admin/rsvps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    setRsvps(data.rsvps || []);
    flash(`Updated ${id}`);
  };

  const resend = async (id: string) => {
    const res = await fetch("/api/admin/rsvps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "resend" }),
    });
    const data = await res.json().catch(() => ({}));
    const result = data.result as { stubbed?: boolean; detail?: string; ok?: boolean } | undefined;
    if (!res.ok) {
      flash(data.error || "Couldn’t resend that email", "warn");
    } else if (result?.stubbed) {
      flash(result.detail || emailNote || "Email was logged only — keys may still be settling.", "warn");
    } else if (result?.ok === false) {
      flash(result.detail || "Couldn’t resend that email", "warn");
    } else {
      flash(result?.detail || "Confirmation email sent");
    }
    void load();
  };

  const saveContent = async () => {
    if (!content) return;
    await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    flash("Invite wording saved — the public page will show it");
  };

  const saveTracks = async () => {
    const normalized = tracks.map((t) => {
      const hex = t.color.trim().toLowerCase();
      const color = TAPE_SPINE_PALETTE.includes(hex)
        ? hex
        : TAPE_SPINE_PALETTE[0];
      return { ...t, color };
    });
    setTracks(normalized);
    await fetch("/api/admin/tracks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracks: normalized }),
    });
    flash("Mixtape updated");
  };

  const saveVideos = async () => {
    await fetch("/api/admin/videos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos }),
    });
    flash("Videos updated");
  };

  const sendMessage = async (payload: Record<string, unknown>) => {
    setSending(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data.emailLive === "boolean") setEmailLive(data.emailLive);
      const status = data.message?.status as string | undefined;
      const warn = !res.ok || data.ok === false || status === "failed" || status === "stubbed";
      flash(data.note || data.error || "Email send finished", warn ? "warn" : "ok");
      void load();
    } finally {
      setSending(false);
    }
  };

  const triggerReminder = async (kind: "party_reminder" | "abandoned_digest") => {
    await fetch("/api/admin/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    flash(
      kind === "abandoned_digest"
        ? "Incomplete-RSVP list emailed to you"
        : "Party reminders sent to guests who said yes",
    );
    void load();
  };

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-neon-gold text-xl">♛</p>
          <h1 className="neon-script-lg text-4xl sm:text-5xl">Hi Ms. Kathy!</h1>
          <p className="mt-2 text-sm text-violet-200 leading-relaxed">
            Everything for Landon &amp; Jordan’s party lives here. Tap a button below to get
            started.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="btn-pink-outline text-xs">
            View invite
          </a>
          <button type="button" onClick={logout} className="btn-pink-outline text-xs">
            Log out
          </button>
        </div>
      </header>

      {toast && (
        <div
          className={`mb-4 rounded-xl border px-4 py-2 text-sm ${
            toastTone === "warn"
              ? "border-amber-400/50 bg-amber-500/10 text-amber-100"
              : "border-neon-green/50 bg-green-500/10 text-neon-green"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-xs tracking-widest font-bold border transition ${
              tab === t.id
                ? "border-neon-pink text-neon-pink shadow-[0_0_14px_#ff2bd650]"
                : "border-white/15 text-violet-200 hover:border-neon-teal/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-6 text-sm text-violet-200 leading-relaxed max-w-3xl">
        {activeTab.explainer}
      </p>

      {tab === "rsvps" && (
        <section className="admin-panel p-5 overflow-x-auto">
          <h2 className="text-lg font-bold mb-2 tracking-wide">Who’s coming</h2>
          <p className="mb-4 text-sm text-violet-100">
            Door-list headcount:{" "}
            <strong className="text-neon-green">{partyHeadcount(rsvps)}</strong>
            <span className="mt-1 block text-xs text-violet-300">
              People on finished RSVPs who didn’t decline. Sample practice rows don’t count.
            </span>
          </p>
          <table className="w-full text-sm text-left min-w-[720px]">
            <thead className="text-violet-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2 pr-2">Sel</th>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Guests</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id),
                        )
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    {r.fullName || "—"}
                    {r.id.startsWith("sample-") && (
                      <span className="ml-2 text-[10px] text-violet-400">SAMPLE</span>
                    )}
                    {r.abandoned && (
                      <span className="ml-2 text-[10px] text-amber-300">STARTED, NOT FINISHED</span>
                    )}
                    {r.companions?.length > 0 && (
                      <p className="text-xs text-violet-300">
                        {r.companions
                          .map((person) => {
                            const name = `${person.firstName} ${person.lastName}`.trim();
                            const age = person.age?.trim();
                            if (!name) return "";
                            return age ? `${name} (age ${age})` : name;
                          })
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {r.dietary === "yes" && r.dietaryNotes && (
                      <p className="text-xs text-amber-200">Dietary: {r.dietaryNotes}</p>
                    )}
                    {r.anythingElse === "yes" && r.specialRequests && (
                      <p className="text-xs text-violet-200">Note: {r.specialRequests}</p>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      className="input-dark py-1"
                      value={r.status}
                      onChange={(e) => patchRsvp(r.id, e.target.value)}
                    >
                      {["confirmed", "maybe", "declined", "pending", "incomplete"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">{r.guestCount}</td>
                  <td className="py-2 pr-2">{r.email || "—"}</td>
                  <td className="py-2 pr-2">{r.phone || "—"}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="text-neon-teal text-xs underline"
                      onClick={() => resend(r.id)}
                      disabled={!r.email}
                    >
                      Resend email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "content" && content && (
        <section className="admin-panel p-5 space-y-4">
          <h2 className="text-lg font-bold tracking-wide">Invite wording</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["brandName", "Brand name"],
                ["heroScript", "Hero script"],
                ["heroChrome", "Chrome word (80s)"],
                ["heroSubtitle", "Hero subtitle"],
                ["heroInvite", "Invite line"],
                ["eventDate", "Date"],
                ["eventVenue", "Venue"],
                ["eventAddress", "Address"],
                ["eventTime", "Time"],
                ["mixtapeHeadline", "Mixtape headline"],
                ["watchHeadline", "Watch headline"],
                ["arcadeHeadline", "Arcade headline"],
                ["lineupTitle", "Lineup title"],
                ["lineupTagline", "Lineup tagline"],
                ["dressCode", "Dress code"],
                ["dressCodePrize", "Dress code prize"],
                ["privateNote", "Private note"],
                ["rsvpHeadline", "RSVP headline"],
                ["footerTagline", "Footer"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="label-muted">{label}</span>
                <input
                  className="input-dark"
                  value={String(content[key] ?? "")}
                  onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="label-muted">RSVP subhead</span>
            <textarea
              className="input-dark min-h-[80px]"
              value={content.rsvpSubhead}
              onChange={(e) => setContent({ ...content, rsvpSubhead: e.target.value })}
            />
          </label>
          <div className="space-y-3">
            <p className="label-muted">Lineup blocks</p>
            {content.lineup.map((b, i) => (
              <div key={b.id} className="grid gap-2 sm:grid-cols-3 border border-white/10 rounded-xl p-3">
                <input
                  className="input-dark"
                  value={b.time}
                  onChange={(e) => {
                    const lineup = [...content.lineup];
                    lineup[i] = { ...b, time: e.target.value };
                    setContent({ ...content, lineup });
                  }}
                  placeholder="Time"
                />
                <input
                  className="input-dark"
                  value={b.title}
                  onChange={(e) => {
                    const lineup = [...content.lineup];
                    lineup[i] = { ...b, title: e.target.value };
                    setContent({ ...content, lineup });
                  }}
                  placeholder="Title"
                />
                <input
                  className="input-dark"
                  value={b.description}
                  onChange={(e) => {
                    const lineup = [...content.lineup];
                    lineup[i] = { ...b, description: e.target.value };
                    setContent({ ...content, lineup });
                  }}
                  placeholder="Description"
                />
              </div>
            ))}
          </div>
          <button type="button" className="btn-green-solid" onClick={saveContent}>
            SAVE CONTENT
          </button>
        </section>
      )}

      {tab === "tracks" && (
        <section className="admin-panel p-5 space-y-3">
          <h2 className="text-lg font-bold">Mixtape tracks</h2>
          <p className="text-xs text-violet-300">
            Tape spine color — pick a swatch from the party palette.
          </p>
          {tracks.map((t, i) => (
            <div key={t.id} className="grid gap-2 sm:grid-cols-4 border border-white/10 rounded-xl p-3">
              <input
                className="input-dark"
                value={t.artist}
                onChange={(e) => {
                  const next = [...tracks];
                  next[i] = { ...t, artist: e.target.value };
                  setTracks(next);
                }}
                placeholder="Artist"
              />
              <input
                className="input-dark"
                value={t.title}
                onChange={(e) => {
                  const next = [...tracks];
                  next[i] = { ...t, title: e.target.value };
                  setTracks(next);
                }}
                placeholder="Title"
              />
              <input
                className="input-dark"
                value={t.audioUrl}
                onChange={(e) => {
                  const next = [...tracks];
                  next[i] = { ...t, audioUrl: e.target.value };
                  setTracks(next);
                }}
                placeholder="/audio/file.mp3"
              />
              <TapeColorSwatches
                value={t.color}
                onChange={(color) => {
                  const next = [...tracks];
                  next[i] = { ...t, color };
                  setTracks(next);
                }}
              />
            </div>
          ))}
          <button type="button" className="btn-green-solid" onClick={saveTracks}>
            SAVE MIXTAPE
          </button>
        </section>
      )}

      {tab === "videos" && (
        <section className="admin-panel p-5 space-y-3">
          <h2 className="text-lg font-bold">Music videos</h2>
          <p className="text-xs text-violet-300">
            Paste a YouTube link — the thumbnail fills in for you.
          </p>
          {videos.map((v, i) => (
            <div key={v.id} className="grid gap-2 sm:grid-cols-2 border border-white/10 rounded-xl p-3">
              <input
                className="input-dark"
                value={v.title}
                onChange={(e) => {
                  const next = [...videos];
                  next[i] = { ...v, title: e.target.value };
                  setVideos(next);
                }}
                placeholder="Title"
              />
              <input
                className="input-dark"
                value={v.artist}
                onChange={(e) => {
                  const next = [...videos];
                  next[i] = { ...v, artist: e.target.value };
                  setVideos(next);
                }}
                placeholder="Artist"
              />
              <input
                className="input-dark sm:col-span-2"
                value={v.videoUrl}
                onChange={(e) => {
                  const videoUrl = e.target.value;
                  const youtubeId = extractYoutubeId(videoUrl) || extractYoutubeId(v.youtubeId);
                  const next = [...videos];
                  next[i] = {
                    ...v,
                    videoUrl,
                    youtubeId,
                    posterUrl: youtubeId ? youtubePosterUrl(youtubeId) : "",
                  };
                  setVideos(next);
                }}
                onBlur={() => {
                  if (!v.youtubeId) return;
                  const next = [...videos];
                  next[i] = {
                    ...v,
                    videoUrl: watchUrl(v.youtubeId),
                    posterUrl: youtubePosterUrl(v.youtubeId),
                  };
                  setVideos(next);
                }}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>
          ))}
          <button type="button" className="btn-green-solid" onClick={saveVideos}>
            SAVE VIDEOS
          </button>
        </section>
      )}

      {tab === "email" && (
        <Composer
          title="Write an email"
          note={
            emailLive
              ? "Your note arrives in the same neon party look as the invite."
              : "Email is ready once the host keys are set — until then, attempts are logged clearly."
          }
          selected={selected}
          onSend={sendMessage}
          history={messages.filter((m) => m.channel === "email")}
          emailLive={emailLive}
          busy={sending}
        />
      )}

      {tab === "reminders" && content && (
        <section className="admin-panel p-5 space-y-5">
          <div>
            <h2 className="text-lg font-bold">Email templates</h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {EMAIL_TEMPLATES.map((tpl: EmailTemplate) => {
              const active = pickedTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setPickedTemplate(tpl.id)}
                  className={`text-left rounded-xl border px-4 py-3 transition ${
                    active
                      ? "border-neon-pink bg-neon-pink/10 shadow-[0_0_14px_#ff2bd640]"
                      : "border-white/15 hover:border-neon-teal/40"
                  }`}
                >
                  <p className="font-semibold text-white">{tpl.label}</p>
                  <p className="mt-1 text-xs text-violet-300">{tpl.audience}</p>
                  <p className="mt-2 text-sm text-violet-100 leading-snug">{tpl.blurb}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-white/15 bg-black/25 p-4 space-y-3">
            <h3 className="text-sm tracking-widest text-neon-teal font-bold">PREVIEW</h3>
            <p className="text-sm text-violet-200">
              <span className="text-violet-400">Subject: </span>
              {activeTemplate.subjectExample(content)}
            </p>
            <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm text-violet-50 leading-relaxed font-sans">
              {activeTemplate.bodyPreview(content)}
            </pre>
            {activeTemplate.sendKind ? (
              <button
                type="button"
                className="btn-green-solid"
                onClick={() => triggerReminder(activeTemplate.sendKind!)}
              >
                {activeTemplate.sendKind === "abandoned_digest"
                  ? "EMAIL ME THE INCOMPLETE LIST"
                  : "SEND THIS REMINDER"}
              </button>
            ) : (
              <p className="text-sm text-amber-200/90">{activeTemplate.howToSend}</p>
            )}
          </div>

          <div>
            <h3 className="text-sm tracking-widest text-violet-300 mb-2">STARTED, NOT FINISHED</h3>
            <p className="mb-2 text-xs text-violet-400">
              People who began the RSVP but didn’t hit submit yet.
            </p>
            <ul className="space-y-2 text-sm">
              {abandoned.length === 0 && <li className="text-violet-400">None right now.</li>}
              {abandoned.map((r) => (
                <li key={r.id} className="border border-amber-400/30 rounded-lg px-3 py-2">
                  {r.fullName || "(no name)"} · {r.email || "no email"} · last field:{" "}
                  {r.lastFieldTouched || "—"}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm tracking-widest text-violet-300 mb-2">RECENT REMINDERS</h3>
            <ul className="space-y-1 text-xs text-violet-200">
              {reminders.length === 0 && (
                <li className="text-violet-400">Nothing sent from here yet.</li>
              )}
              {reminders.map((r) => (
                <li key={r.id}>
                  {r.createdAt} — {r.kind}: {r.note} [{r.status}]
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}


function TapeColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const selected = value.trim().toLowerCase();
  const inPalette = TAPE_SPINE_PALETTE.includes(selected);
  return (
    <div className="space-y-1">
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Tape spine color"
      >
        {TAPE_SPINE_PALETTE.map((hex) => {
          const active = selected === hex;
          return (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={active}
              title={hex}
              onClick={() => onChange(hex)}
              className={`h-8 w-8 rounded-full border-2 transition ${
                active
                  ? "border-white shadow-[0_0_10px_#ff2bd680] scale-110"
                  : "border-white/20 hover:border-neon-teal/60"
              }`}
              style={{ background: hex }}
            />
          );
        })}
      </div>
      <span className="text-[10px] text-violet-400">
        {inPalette ? selected : `${selected || "—"} → pick a swatch`}
      </span>
    </div>
  );
}

function Composer({
  title,
  note,
  selected,
  onSend,
  history,
  emailLive,
  busy,
}: {
  title: string;
  note: string;
  selected: string[];
  onSend: (payload: Record<string, unknown>) => void;
  history: MessageLog[];
  emailLive?: boolean;
  busy?: boolean;
}) {
  const [subject, setSubject] = useState("Party update");
  const [body, setBody] = useState(
    "Hey! Quick update about Landon & Jordan's 80s Birthday Party…",
  );
  const [segment, setSegment] = useState("attending");

  return (
    <section className="admin-panel p-5 space-y-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-violet-300">{note}</p>
      <label className="block">
        <span className="label-muted">Subject</span>
        <input className="input-dark" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="block">
        <span className="label-muted">Message</span>
        <textarea
          className="input-dark min-h-[120px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label-muted">Who should get this?</span>
        <select className="input-dark" value={segment} onChange={(e) => setSegment(e.target.value)}>
          <option value="one">Only the ones I checked ({selected.length} in RSVPs)</option>
          <option value="attending">Everyone who’s coming</option>
          <option value="all">Everyone with an email</option>
          <option value="incomplete">People who started but didn’t finish</option>
        </select>
      </label>
      <button
        type="button"
        className="btn-green-solid disabled:opacity-60"
        disabled={busy}
        onClick={() =>
          onSend({
            subject,
            body,
            segment: segment === "one" ? "selected" : segment,
            recipientIds: selected,
          })
        }
      >
        {busy ? "SENDING…" : "SEND EMAIL"}
      </button>
      <div>
        <h3 className="text-xs tracking-widest text-violet-300 mb-2">RECENT EMAILS</h3>
        <ul className="space-y-1 text-xs">
          {history.slice(0, 8).map((m) => (
            <li key={m.id}>
              {m.createdAt} · {m.segment} · {m.recipientCount} ppl · {m.status}
              {m.subject ? ` · ${m.subject}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
