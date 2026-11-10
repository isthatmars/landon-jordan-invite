"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
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
    await fetch("/api/admin/rsvps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "resend" }),
    });
    flash("Confirmation email stubbed (Resend)");
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
    await fetch("/api/admin/tracks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracks }),
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
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, ...payload }),
    });
    const data = await res.json();
    flash(data.note || "Message stubbed");
    void load();
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
            Resend email live when keys set · SMS deferred (stubs kept) · same 80s vibe
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
        <div className="mb-4 rounded-xl border border-neon-green/50 bg-green-500/10 px-4 py-2 text-sm text-neon-green">
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
          <h2 className="text-lg font-bold mb-4 tracking-wide">RSVPs & invites</h2>
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
                    {r.abandoned && (
                      <span className="ml-2 text-[10px] text-amber-300">ABANDONED</span>
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
              <input
                className="input-dark"
                value={t.color}
                onChange={(e) => {
                  const next = [...tracks];
                  next[i] = { ...t, color: e.target.value };
                  setTracks(next);
                }}
                placeholder="#ff2bd6"
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
          note="Renders into the neon invite template. Sent via Resend stub (primary channel)."
          channel="email"
          selected={selected}
          onSend={(payload) => sendMessage("email", payload)}
          history={messages.filter((m) => m.channel === "email")}
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
          />
        </section>
      )}

      {tab === "reminders" && (
        <section className="admin-panel p-5 space-y-4">
          <h2 className="text-lg font-bold">Reminders & abandoned forms</h2>
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
            <h3 className="text-sm tracking-widest text-violet-300 mb-2">INCOMPLETE / ABANDONED</h3>
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

function Composer({
  title,
  note,
  channel,
  selected,
  onSend,
  history,
  sms,
}: {
  title: string;
  note: string;
  channel: "email" | "sms";
  selected: string[];
  onSend: (payload: Record<string, unknown>) => void;
  history: MessageLog[];
  sms?: boolean;
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
        className="btn-green-solid"
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
        {sms ? "QUEUE SMS (STUB)" : "SEND EMAIL (STUB)"}
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
