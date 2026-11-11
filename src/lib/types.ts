export type AttendStatus = "yes" | "no" | "maybe";

export type RsvpStatus =
  | "confirmed"
  | "declined"
  | "maybe"
  | "pending"
  | "incomplete";

/** Someone coming with the person who filled out the form. Both names are required. */
export interface PartyPerson {
  firstName: string;
  lastName: string;
  /** Optional — usually for children. Empty string when omitted. */
  age?: string;
}

export interface RsvpRecord {
  id: string;
  firstName: string;
  lastName: string;
  /** firstName + lastName, kept so older admin and email code can greet them. */
  fullName: string;
  attend: AttendStatus;
  /**
   * Named people on the door list, including the person who submitted.
   * 0 when they cannot attend. This is the headcount, not the number of forms.
   */
  guestCount: number;
  companions: PartyPerson[];
  phone: string;
  email: string;
  dietary: "yes" | "no" | "";
  dietaryNotes: string;
  anythingElse: "yes" | "no" | "";
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
  eventAddress: string;
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
  /** Official YouTube video. Choosing this tape plays it inside the TV. */
  youtubeId: string;
  audioUrl: string;
  sortOrder: number;
}

export interface VideoItem {
  id: string;
  title: string;
  artist: string;
  posterUrl: string;
  /** Official YouTube video played inside the television. */
  youtubeId: string;
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
