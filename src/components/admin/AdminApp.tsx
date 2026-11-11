"use client";

import { useCallback, useEffect, useState } from "react";
import { TAPE_SPINE_PALETTE } from "@/lib/defaults";
import { partyHeadcount } from "@/lib/rsvp";
import type {
  MessageLog,
  ReminderLog,
  RsvpRecord,
  SiteContent,
  Track,
  VideoItem,
} from "@/lib/types";

type Tab =
  | "rsvps"
  | "content"
  | "tracks"
  | "videos"
  | "email"
  | "sms"
  | "reminders";

const TABS: { id: Tab; label: string }[] = [
  { id: "rsvps", label: "RSVPs" },
  { id: "content", label: "Content" },
  { id: "tracks", label: "Mixtape" },
  { id: "videos", label: "Videos" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "reminders", label: "Reminders" },
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
  const [smsProvider, setSmsProvider] = useState("none");
  const [emailLive, setEmailLive] = useState(false);
  const [emailNote, setEmailNote] = useState("");
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState<"ok" | "warn">("ok");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

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
    setSmsProvider(m.smsProvider || "none");
    setEmailLive(Boolean(m.emailLive));
    setEmailNote(typeof m.emailNote === "string" ? m.emailNote : "");
    setReminders(rem.reminders || []);
    setAbandoned(rem.abandoned || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      flash(data.error || "Resend failed", "warn");
    } else if (result?.stubbed) {
      flash(result.detail || emailNote || "Logged only — set RESEND_API_KEY to go live.", "warn");
    } else if (result?.ok === false) {
      flash(result.detail || "Resend failed", "warn");
    } else {
      flash(result?.detail || "Confirmation email sent via Resend");
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
    flash("Site content saved — public page will read it");
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

  const sendMessage = async (channel: "email" | "sms", payload: Record<string, unknown>) => {
    setSending(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data.emailLive === "boolean") setEmailLive(data.emailLive);
      const status = data.message?.status as string | undefined;
      const warn =
        !res.ok || data.ok === false || status === "failed" || status === "stubbed" || channel === "sms";
      flash(data.note || data.error || "Message send finished", warn ? "warn" : "ok");
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
    flash(kind === "abandoned_digest" ? "Abandoned digest stubbed to owner email" : "Party reminders stubbed");
    void load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-neon-gold text-xl">♛</p>
          <h1 className="neon-script-lg text-4xl">Neon Control Room</h1>
          <p className="text-sm text-violet-300">
            {emailLive
              ? "Resend email live · SMS deferred (stubs kept) · same 80s vibe"
              : "Email needs RESEND_API_KEY · SMS deferred · same 80s vibe"}
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
              ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
              : "border-neon-green/50 bg-green-500/10 text-neon-green"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
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

      {tab === "rsvps" && (
        <section className="admin-panel p-5 overflow-x-auto">
          <h2 className="text-lg font-bold mb-2 tracking-wide">RSVPs & invites</h2>
          <p className="mb-4 text-sm text-violet-100">
            Door-list headcount:{" "}
            <strong className="text-neon-green">{partyHeadcount(rsvps)}</strong>
            <span className="mt-1 block text-xs text-violet-300">
              Sum of guest counts on completed RSVPs that are not declined. Sample rows are
              excluded.
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
                      <span className="ml-2 text-[10px] text-amber-300">ABANDONED</span>
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
          <h2 className="text-lg font-bold tracking-wide">CMS — site copy</h2>
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
            Spine color — pick a swatch from the site palette (no custom hex).
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
          <h2 className="text-lg font-bold">Music video placeholders</h2>
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
                className="input-dark"
                value={v.posterUrl}
                onChange={(e) => {
                  const next = [...videos];
                  next[i] = { ...v, posterUrl: e.target.value };
                  setVideos(next);
                }}
                placeholder="Poster URL"
              />
              <input
                className="input-dark"
                value={v.videoUrl}
                onChange={(e) => {
                  const next = [...videos];
                  next[i] = { ...v, videoUrl: e.target.value };
                  setVideos(next);
                }}
                placeholder="Video URL (mp4/youtube later)"
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
          title="Email composer"
          note={
            emailLive
              ? "Renders into the neon invite template and sends via Resend (primary channel)."
              : emailNote ||
                "Renders into the neon invite template. Set RESEND_API_KEY + RESEND_FROM_EMAIL to send for real — until then history logs a clear stub."
          }
          channel="email"
          selected={selected}
          onSend={(payload) => sendMessage("email", payload)}
          history={messages.filter((m) => m.channel === "email")}
          emailLive={emailLive}
          busy={sending}
        />
      )}

      {tab === "sms" && (
        <section className="space-y-4">
          <div className="admin-panel p-4 text-sm text-violet-200">
            <p className="font-bold text-neon-pink mb-1">Email-first · SMS optional</p>
            <p>
              Active provider: <code className="text-neon-teal">{smsProvider}</code>. Guest mass SMS
              defaults off. Prefer WhatsApp, phone Messages export, or light tools
              (LoopMessage / TextMagic-style). Twilio A2P 10DLC is overkill for a personal party —
              trial owner-only alerts are enough if you want SMS pings.
            </p>
            <p className="mt-2 text-xs text-violet-400">
              Future: group-chat thread + AI text-to-edit drafts before send.
            </p>
          </div>
          <Composer
            title="SMS composer"
            note="Pluggable provider. If provider=none, this logs/export-stubs only."
            channel="sms"
            selected={selected}
            onSend={(payload) => sendMessage("sms", payload)}
            history={messages.filter((m) => m.channel === "sms")}
            sms
            busy={sending}
          />
        </section>
      )}

      {tab === "reminders" && (
        <section className="admin-panel p-5 space-y-4">
          <h2 className="text-lg font-bold">Reminders and forms in progress</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-green-solid"
              onClick={() => triggerReminder("party_reminder")}
            >
              SEND PARTY REMINDERS
            </button>
            <button
              type="button"
              className="btn-pink-outline text-xs"
              onClick={() => triggerReminder("abandoned_digest")}
            >
              OWNER ABANDONED DIGEST
            </button>
          </div>
          <div>
            <h3 className="text-sm tracking-widest text-violet-300 mb-2">IN PROGRESS</h3>
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
            <h3 className="text-sm tracking-widest text-violet-300 mb-2">REMINDER LOG</h3>
            <ul className="space-y-1 text-xs text-violet-200">
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
    <div className="flex flex-col justify-center gap-1.5 min-w-0">
      <div
        role="radiogroup"
        aria-label="Tape spine color"
        className="flex flex-wrap items-center gap-1.5"
      >
        {TAPE_SPINE_PALETTE.map((hex) => {
          const isOn = selected === hex;
          return (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={isOn}
              aria-label={hex}
              title={hex}
              onClick={() => onChange(hex)}
              className={`h-7 w-7 shrink-0 rounded-md border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal ${
                isOn
                  ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.45)]"
                  : "border-white/25 hover:border-white/70 hover:scale-105"
              }`}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>
      <span className="text-[10px] tracking-wide text-violet-300 font-mono">
        {inPalette ? selected : `${selected || "—"} → pick a swatch`}
      </span>
    </div>
  );
}

function Composer({
  title,
  note,
  channel,
  selected,
  onSend,
  history,
  sms,
  emailLive,
  busy,
}: {
  title: string;
  note: string;
  channel: "email" | "sms";
  selected: string[];
  onSend: (payload: Record<string, unknown>) => void;
  history: MessageLog[];
  sms?: boolean;
  emailLive?: boolean;
  busy?: boolean;
}) {
  const [subject, setSubject] = useState("Party update");
  const [body, setBody] = useState(
    "Hey! Quick update about Landon & Jordan's 80s Birthday Party…",
  );
  const [segment, setSegment] = useState("attending");

  const emailButtonLabel = emailLive ? "SEND EMAIL" : "SEND EMAIL (needs Resend key)";

  return (
    <section className="admin-panel p-5 space-y-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-violet-300">{note}</p>
      {!sms && !emailLive && (
        <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Not a permanent stub — once <code className="text-neon-teal">RESEND_API_KEY</code> (and
          preferably <code className="text-neon-teal">RESEND_FROM_EMAIL</code>) are set on the host,
          this button sends the neon template for real. History still records every attempt.
        </p>
      )}
      {!sms && (
        <label className="block">
          <span className="label-muted">Subject</span>
          <input className="input-dark" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
      )}
      <label className="block">
        <span className="label-muted">Message</span>
        <textarea
          className="input-dark min-h-[120px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label-muted">Segment</span>
        <select className="input-dark" value={segment} onChange={(e) => setSegment(e.target.value)}>
          <option value="one">One / selected ({selected.length} checked in RSVPs)</option>
          <option value="attending">Attending</option>
          <option value="all">Everyone</option>
          <option value="incomplete">Incomplete / abandoned</option>
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
            channel,
          })
        }
      >
        {busy ? "SENDING…" : sms ? "QUEUE SMS (STUB)" : emailButtonLabel}
      </button>
      <div>
        <h3 className="text-xs tracking-widest text-violet-300 mb-2">HISTORY</h3>
        <ul className="space-y-1 text-xs">
          {history.slice(0, 8).map((m) => (
            <li key={m.id}>
              {m.createdAt} · {m.segment} · {m.recipientCount} ppl · {m.status}
              {!sms && m.subject ? ` · ${m.subject}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
