"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TAPE_SPINE_PALETTE } from "@/lib/defaults";
import {
  EMAIL_TEMPLATE_META,
  mergeEmailTemplates,
  renderEditableEmail,
  type EditableEmailTemplateId,
  type EmailTemplateCopy,
  type StoredEmailTemplates,
} from "@/lib/email-templates";
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
type View = Tab | "home";
type CardAccent = "pink" | "teal" | "gold" | "purple" | "green";

const TABS: {
  id: Tab;
  label: string;
  explainer: string;
  accent: CardAccent;
}[] = [
  {
    id: "rsvps",
    label: "RSVPs",
    accent: "pink",
    explainer:
      "See who's coming, update guest responses, and resend confirmation emails.",
  },
  {
    id: "content",
    label: "Content",
    accent: "teal",
    explainer:
      "Update invitation details, including the date, location, dress code, and headlines.",
  },
  {
    id: "tracks",
    label: "Mixtape",
    accent: "gold",
    explainer:
      "Add or update songs, artists, and audio files for the interactive boombox.",
  },
  {
    id: "videos",
    label: "Videos",
    accent: "purple",
    explainer:
      "Manage the music videos guests can watch, including titles, artists, and video links.",
  },
  {
    id: "email",
    label: "Email",
    accent: "green",
    explainer:
      "One-off notes to guests. The full editable party email suite (confirmations, reminders, thank-you) lives under Templates.",
  },
  {
    id: "reminders",
    label: "Templates",
    accent: "pink",
    explainer:
      "All 9 party emails — edit subject, body, and CTA, preview the hero look, then send when you’re ready.",
  },
];

export function AdminApp() {
  const [view, setView] = useState<View>("home");
  const tab = view === "home" ? null : view;
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [abandoned, setAbandoned] = useState<RsvpRecord[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<StoredEmailTemplates>(
    () => mergeEmailTemplates(null),
  );
  const [openTemplate, setOpenTemplate] = useState<EditableEmailTemplateId | null>(
    null,
  );
  const [draftCopy, setDraftCopy] = useState<EmailTemplateCopy | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const templatePanelRef = useRef<HTMLDivElement | null>(null);
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
    const [r, c, t, v, m, rem, tpl] = await Promise.all([
      fetch("/api/admin/rsvps").then((x) => x.json()),
      fetch("/api/admin/content").then((x) => x.json()),
      fetch("/api/admin/tracks").then((x) => x.json()),
      fetch("/api/admin/videos").then((x) => x.json()),
      fetch("/api/admin/messages").then((x) => x.json()),
      fetch("/api/admin/reminders").then((x) => x.json()),
      fetch("/api/admin/email-templates").then((x) => x.json()),
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
    setEmailTemplates(mergeEmailTemplates(tpl.templates || rem.templates || null));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openTemplate) return;
    const timer = window.setTimeout(() => {
      templatePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [openTemplate]);

  const openTemplatePanel = (id: EditableEmailTemplateId) => {
    setOpenTemplate(id);
    setDraftCopy({ ...emailTemplates[id] });
  };

  const closeTemplatePanel = () => {
    setOpenTemplate(null);
    setDraftCopy(null);
  };

  const saveTemplateCopy = async () => {
    if (!openTemplate || !draftCopy) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: openTemplate, copy: draftCopy }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash(data.error || "Couldn’t save that template", "warn");
        return;
      }
      const merged = mergeEmailTemplates(data.templates);
      setEmailTemplates(merged);
      setDraftCopy({ ...merged[openTemplate] });
      flash("Email wording saved");
    } finally {
      setSavingTemplate(false);
    }
  };

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

  const triggerReminder = async (kind: EditableEmailTemplateId) => {
    setSending(true);
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash(data.error || "Couldn’t send that email", "warn");
      } else if (data.reminder?.status === "stubbed" || data.reminder?.status === "failed") {
        flash(data.reminder?.note || emailNote || "Send finished with a warning", "warn");
      } else {
        flash(
          kind === "abandoned_digest"
            ? "Incomplete-RSVP list emailed to you"
            : data.reminder?.note || "Emails sent to guests who said yes",
        );
      }
      void load();
    } finally {
      setSending(false);
    }
  };

  const activeTab = tab ? TABS.find((t) => t.id === tab) : null;
  const onHome = view === "home";

  return (
    <div className="admin-control-room mx-auto max-w-6xl px-4 py-8 sm:py-10">
      {onHome ? (
        <header className="admin-dash-header mb-8 sm:mb-10">
          <div className="admin-dash-intro">
            <p className="admin-dash-crown" aria-hidden>
              ♛
            </p>
            <h1 className="neon-script-lg admin-dash-hello">Hi Ms. Kathy!</h1>
            <h2 className="admin-dash-welcome">Welcome to your control room!</h2>
            <p className="admin-dash-lede">
              Everything for Landon &amp; Jordan&apos;s party lives here. Use the tools below to
              manage guests, update the invite, and keep everyone in the loop.
            </p>
          </div>
          <div className="admin-brand-badge" aria-hidden>
            <p className="admin-brand-kicker">Landon &amp; Jordan&apos;s</p>
            <p className="admin-brand-pill">
              <span className="admin-brand-line" />
              <span className="admin-brand-label">Control Room</span>
              <span className="admin-brand-line" />
            </p>
          </div>
        </header>
      ) : (
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="admin-panel-heading">
            <button
              type="button"
              className="admin-back-link"
              onClick={() => {
                closeTemplatePanel();
                setView("home");
              }}
            >
              ← back
            </button>
            <h1 className="admin-panel-title text-2xl font-bold tracking-wide text-white">
              {activeTab?.label}
            </h1>
            {activeTab && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-violet-200">
                {activeTab.explainer}
              </p>
            )}
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
      )}

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

      {onHome && (
        <>
          <nav className="admin-card-grid" aria-label="Control room tools">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`admin-tool-card admin-tool-card--${t.accent}`}
                onClick={() => {
                  if (t.id !== "reminders") closeTemplatePanel();
                  setView(t.id);
                }}
              >
                <span className="admin-tool-card__icon" aria-hidden>
                  <ToolIcon id={t.id} />
                </span>
                <span className="admin-tool-card__body">
                  <span className="admin-tool-card__title">{t.label}</span>
                  <span className="admin-tool-card__desc">{t.explainer}</span>
                </span>
                <span className="admin-tool-card__arrow" aria-hidden>
                  →
                </span>
              </button>
            ))}
          </nav>

          <div className="admin-dash-actions">
            <a href="/" className="admin-btn-invite">
              <EyeIcon />
              View invite
            </a>
            <button type="button" onClick={logout} className="admin-btn-logout">
              <LogoutIcon />
              Log out
            </button>
          </div>
        </>
      )}

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
        <div className="space-y-4">
          <div className="admin-panel border border-neon-pink/40 bg-fuchsia-950/30 p-4 sm:p-5">
            <p className="text-sm font-bold tracking-wide text-white">
              Looking for the party email templates?
            </p>
            <p className="mt-1 text-sm leading-relaxed text-violet-200">
              Confirmations, 30-day / tomorrow / today reminders, what-to-bring, thank-you, and
              host alerts are editable under Templates — not in this freeform composer.
            </p>
            <button
              type="button"
              className="btn-pink-outline mt-3 text-xs"
              onClick={() => setView("reminders")}
            >
              Edit party email templates → Templates
            </button>
          </div>
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
        </div>
      )}

      {tab === "reminders" && content && (
        <section className="admin-panel admin-templates-section p-10 space-y-10">
          <div>
            <p className="text-neon-gold text-lg leading-none">♛</p>
            <h2 className="neon-script text-3xl sm:text-4xl mt-1">Email Templates</h2>
            <p className="mt-2 text-sm text-violet-200 max-w-2xl leading-relaxed">
              Simple buttons — tap one to open it, edit the words, preview the hero look, then
              send. Opening another closes the last.
            </p>
          </div>

          <div className="admin-templates-grid grid grid-cols-1 gap-4 md:grid-cols-2">
            {EMAIL_TEMPLATE_META.map((tpl) => {
              const active = openTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() =>
                    active ? closeTemplatePanel() : openTemplatePanel(tpl.id)
                  }
                  className={`admin-template-btn text-left ${active ? "is-open" : ""}`}
                >
                  <span className="block font-bold tracking-wide text-white uppercase text-sm">
                    {tpl.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-violet-300">{tpl.blurb}</span>
                </button>
              );
            })}
          </div>

          <div
            ref={templatePanelRef}
            className={`admin-template-panel ${openTemplate && draftCopy ? "is-open" : ""}`}
          >
            {openTemplate && draftCopy && (
              <TemplateEditor
                id={openTemplate}
                copy={draftCopy}
                content={content}
                saving={savingTemplate}
                sending={sending}
                onChange={setDraftCopy}
                onSave={() => void saveTemplateCopy()}
                onSend={() => void triggerReminder(openTemplate)}
                onClose={closeTemplatePanel}
              />
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

function TemplateEditor({
  id,
  copy,
  content,
  saving,
  sending,
  onChange,
  onSave,
  onSend,
  onClose,
}: {
  id: EditableEmailTemplateId;
  copy: EmailTemplateCopy;
  content: SiteContent;
  saving: boolean;
  sending: boolean;
  onChange: (next: EmailTemplateCopy) => void;
  onSave: () => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const meta = EMAIL_TEMPLATE_META.find((t) => t.id === id)!;
  const preview = renderEditableEmail(
    copy,
    content,
    {
      guestName: "Sample Guest",
      guestEmail: "guest@example.com",
      guestPhone: "305-555-0100",
      guestCount: 2,
      status: "confirmed",
      namedPeopleHtml:
        "<ul style='margin:8px 0;padding-left:18px;color:#fff'><li>Sample Guest</li><li>Demo Plusone</li></ul>",
      dietaryBlockHtml: "<p style='margin:8px 0;color:#c4b5d8'>No dietary notes.</p>",
      abandonedListHtml:
        "<ul style='margin:8px 0;padding-left:18px'><li>Started Form — almost@example.com</li></ul>",
      inviteUrl: "https://www.landonandjordan.com",
      uploadLink: copy.uploadLink || "https://example.com/upload-party-photos",
    },
    id,
  );

  const patch = (key: keyof EmailTemplateCopy, value: string) => {
    onChange({ ...copy, [key]: value });
  };

  return (
    <div className="relative space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-neon-teal font-bold">
            {meta.audience}
          </p>
          <h3 className="neon-script text-2xl mt-1">{meta.label}</h3>
        </div>
        <button
          type="button"
          aria-label="Close template"
          onClick={onClose}
          className="admin-template-close"
        >
          ×
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label-muted">Subject</span>
          <input
            className="input-dark"
            value={copy.subject}
            onChange={(e) => patch("subject", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label-muted">Eyebrow</span>
          <input
            className="input-dark"
            value={copy.eyebrow}
            onChange={(e) => patch("eyebrow", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label-muted">Headline</span>
          <input
            className="input-dark"
            value={copy.headline}
            onChange={(e) => patch("headline", e.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label-muted">Body (use {"{{guestName}}"}, {"{{eventDate}}"}, etc.)</span>
          <textarea
            className="input-dark min-h-[160px] font-sans"
            value={copy.body}
            onChange={(e) => patch("body", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label-muted">Button label</span>
          <input
            className="input-dark"
            value={copy.ctaLabel}
            onChange={(e) => patch("ctaLabel", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label-muted">Button link</span>
          <input
            className="input-dark"
            value={copy.ctaUrl}
            onChange={(e) => patch("ctaUrl", e.target.value)}
          />
        </label>
        {id === "thank_you" && (
          <label className="block sm:col-span-2">
            <span className="label-muted">Photo upload link ({`{{uploadLink}}`})</span>
            <input
              className="input-dark"
              value={copy.uploadLink}
              onChange={(e) => patch("uploadLink", e.target.value)}
              placeholder="https://…"
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-green-solid disabled:opacity-60"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "SAVING…" : "SAVE WORDS"}
        </button>
        {meta.sendable && (
          <button
            type="button"
            className="btn-pink-outline text-xs disabled:opacity-60"
            disabled={sending}
            onClick={onSend}
          >
            {sending ? "SENDING…" : "SEND TO GUESTS COMING"}
          </button>
        )}
        {meta.ownerDigest && (
          <button
            type="button"
            className="btn-pink-outline text-xs disabled:opacity-60"
            disabled={sending}
            onClick={onSend}
          >
            {sending ? "SENDING…" : "EMAIL ME THE INCOMPLETE LIST"}
          </button>
        )}
        {meta.howToSend && (
          <p className="w-full text-sm text-amber-200/90">{meta.howToSend}</p>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-sm tracking-widest text-neon-teal font-bold">PREVIEW</h4>
        <p className="text-sm text-violet-200">
          <span className="text-violet-400">Subject: </span>
          {preview.subject}
        </p>
        <div className="admin-email-preview overflow-hidden rounded-xl border border-neon-pink/40 shadow-[0_0_18px_#ff2bd640]">
          <iframe
            title={`${meta.label} preview`}
            className="w-full min-h-[420px] bg-[#07010f]"
            sandbox=""
            srcDoc={preview.html}
          />
        </div>
      </div>
    </div>
  );
}

function ToolIcon({ id }: { id: Tab }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: "0 0 40 40",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };
  switch (id) {
    case "rsvps":
      return (
        <svg {...common}>
          <rect x="9" y="6" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M14 14h12M14 20h12M14 26h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 25.5l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "content":
      return (
        <svg {...common}>
          <rect x="8" y="9" width="24" height="22" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M8 15h24" stroke="currentColor" strokeWidth="2" />
          <path d="M14 6v6M26 6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 21h8M14 26h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "tracks":
      return (
        <svg {...common}>
          <rect x="6" y="12" width="28" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="14" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="26" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" />
          <path d="M17.5 20h5" stroke="currentColor" strokeWidth="2" />
          <path d="M10 12V10.5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2V12" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "videos":
      return (
        <svg {...common}>
          <rect x="7" y="12" width="26" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
          <path d="M14 12l-2-5M26 12l2-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="14" cy="8" r="1.5" fill="currentColor" />
          <circle cx="26" cy="8" r="1.5" fill="currentColor" />
          <rect x="11" y="16" width="18" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "email":
      return (
        <svg {...common}>
          <rect x="6" y="11" width="28" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M8 13.5L20 22 32 13.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "reminders":
      return (
        <svg {...common}>
          <path
            d="M20 6c-5 0-9 3.6-9 9v4.2l-2.4 3.6A1 1 0 0 0 9.4 25h21.2a1 1 0 0 0 .8-1.6L29 19.2V15c0-5.4-4-9-9-9Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M17 28a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 16l4-4-4-4M10 12h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
