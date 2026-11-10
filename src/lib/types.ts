export type AttendStatus = "yes" | "no" | "maybe";

export type RsvpStatus =
  | "confirmed"
  | "declined"
  | "maybe"
  | "pending"
  | "incomplete";

export interface RsvpRecord {
  id: string;
  fullName: string;
  attend: AttendStatus;
  guestCount: number;
  phone: string;
  email: string;
  specialRequests: string;
  status: RsvpStatus;
  confirmationSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Abandoned-form tracking */
  formStartedAt?: string | null;
  formCompletedAt?: string | null;
  lastFieldTouched?: string | null;
  abandoned?: boolean;
}

export interface LineupBlock {
  id: string;
  time: string;
  title: string;
  description: string;
  icon: "skate" | "dinner" | "dj";
}

export interface SiteContent {
  brandName: string;
  heroScript: string;
  heroChrome: string;
  heroSubtitle: string;
  heroInvite: string;
  eventDate: string;
  eventVenue: string;
  eventTime: string;
  mixtapeHeadline: string;
  watchHeadline: string;
  arcadeHeadline: string;
  lineupTitle: string;
  lineupTagline: string;
  lineup: LineupBlock[];
  dressCode: string;
  dressCodePrize: string;
  privateNote: string;
  rsvpHeadline: string;
  rsvpSubhead: string;
  footerTagline: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  color: string;
  audioUrl: string;
  sortOrder: number;
}

export interface VideoItem {
  id: string;
  title: string;
  artist: string;
  /** Placeholder poster or thumbnail path */
  posterUrl: string;
  /** Placeholder video URL — swap later */
  videoUrl: string;
  sortOrder: number;
}

export interface MessageLog {
  id: string;
  channel: "email" | "sms";
  subject?: string;
  body: string;
  segment: "one" | "attending" | "all" | "incomplete" | "selected";
  recipientIds: string[];
  recipientCount: number;
  status: "stubbed" | "queued" | "sent" | "failed";
  createdAt: string;
}

export interface ReminderLog {
  id: string;
  kind: "party_reminder" | "abandoned_digest";
  note: string;
  status: "stubbed" | "queued" | "sent";
  createdAt: string;
}

export interface AppStore {
  content: SiteContent;
  tracks: Track[];
  videos: VideoItem[];
  rsvps: RsvpRecord[];
  messages: MessageLog[];
  reminders: ReminderLog[];
}
