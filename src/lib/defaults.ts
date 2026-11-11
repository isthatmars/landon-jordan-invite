import { emptyEmailTemplates } from "./email-templates";
import type { AppStore, SiteContent, Track, VideoItem } from "./types";
import { watchUrl, youtubePosterUrl } from "./youtube";

export const defaultContent: SiteContent = {
  brandName: "Landon & Jordan's",
  heroScript: "Landon & Jordan's",
  heroChrome: "80s",
  heroSubtitle: "BIRTHDAY PARTY",
  heroInvite: "You're Invited!",
  eventDate: "SATURDAY DEC 19, 2026",
  eventVenue: "XTREME ACTION PARK",
  eventAddress: "5300 POWERLINE RD, FORT LAUDERDALE, FL 33309",
  eventTime: "6:00 PM – MIDNIGHT",
  mixtapeHeadline: "Choose a Tape and Press Play!",
  watchHeadline: "Watch Classic Music Videos",
  arcadeHeadline: "Play Pac-Man!",
  lineupTitle: "THE OFFICIAL PARTY LINEUP",
  lineupTagline: "OLD SCHOOL MUSIC • FRESH FITS • GOOD VIBES.",
  lineup: [
    {
      id: "roll",
      time: "6:00 PM – 7:30 PM",
      title: "LET'S ROLL!",
      description:
        "Lace up your skates and hit the floor! Whether you're showing off your moves or just enjoying the music, it's all about having a good time!",
      icon: "skate",
    },
    {
      id: "dinner",
      time: "7:30 PM – 9:00 PM",
      title: "DINNER & GOOD VIBES",
      description:
        "Take a break from the floor, grab a plate, and enjoy a delicious dinner buffet while catching up with friends.",
      icon: "dinner",
    },
    {
      id: "dj",
      time: "9:00 PM – MIDNIGHT",
      title: "THE DJ BATTLE & DANCE PARTY",
      description:
        "Get ready for an unforgettable night of old-school hip-hop, R&B, South Florida bass, and your favorite 80s jams. Let the DJ battle begin!",
      icon: "dj",
    },
  ],
  dressCode: "80s FRESH!",
  dressCodePrize: "We've got a special prize for the guest with the Flyest 80s Look!",
  privateNote: "PRIVATE PARTY | INVITED GUESTS ONLY",
  rsvpHeadline: "RSVP",
  rsvpSubhead:
    "CONFIRM YOUR ATTENDANCE FOR LANDON & JORDAN'S 80S BIRTHDAY PARTY!",
  footerTagline: "GOOD MUSIC. GREAT COMPANY. CLASSIC 80s VIBES.",
  updatedAt: new Date().toISOString(),
};

export const defaultTracks: Track[] = [
  { id: "t1", title: "Beat It", artist: "Michael Jackson", color: "#e11d48", youtubeId: "oRdxUFDoQe0", audioUrl: watchUrl("oRdxUFDoQe0"), sortOrder: 1 },
  { id: "t2", title: "It's My Cadillac (Got That Bass)", artist: "MC Nas-D & DJ Freaky Fred", color: "#22c55e", youtubeId: "ZXATR-UCNJk", audioUrl: watchUrl("ZXATR-UCNJk"), sortOrder: 2 },
  { id: "t3", title: "Sucker M.C.'s", artist: "RUN-D.M.C.", color: "#3b82f6", youtubeId: "iOKMWSR2Aio", audioUrl: watchUrl("iOKMWSR2Aio"), sortOrder: 3 },
  { id: "t4", title: "It's Like That", artist: "RUN-D.M.C.", color: "#60a5fa", youtubeId: "TLGWQfK-6DY", audioUrl: watchUrl("TLGWQfK-6DY"), sortOrder: 4 },
  { id: "t5", title: "Push It", artist: "Salt-N-Pepa", color: "#ec4899", youtubeId: "vCadcBR95oU", audioUrl: watchUrl("vCadcBR95oU"), sortOrder: 5 },
  { id: "t6", title: "Conga", artist: "Miami Sound Machine", color: "#eab308", youtubeId: "54ItEmCnP80", audioUrl: watchUrl("54ItEmCnP80"), sortOrder: 6 },
  { id: "t7", title: "Purple Rain", artist: "Prince", color: "#a855f7", youtubeId: "TvnYmWpD_T8", audioUrl: watchUrl("TvnYmWpD_T8"), sortOrder: 7 },
  { id: "t8", title: "Banned in the U.S.A.", artist: "2 Live Crew", color: "#f97316", youtubeId: "oNsdMFCXH9M", audioUrl: watchUrl("oNsdMFCXH9M"), sortOrder: 8 },
  { id: "t9", title: "I Wanna Dance with Somebody", artist: "Whitney Houston", color: "#22d3ee", youtubeId: "eH3giaIzONA", audioUrl: watchUrl("eH3giaIzONA"), sortOrder: 9 },
];

/** Site mixtape spine palette — admin may only pick from these. */
export const TAPE_SPINE_PALETTE: readonly string[] = Array.from(
  new Set(defaultTracks.map((t) => t.color.toLowerCase())),
);

function videoFrom(
  id: string,
  title: string,
  artist: string,
  youtubeId: string,
  sortOrder: number,
): VideoItem {
  return {
    id,
    title,
    artist,
    youtubeId,
    videoUrl: watchUrl(youtubeId),
    posterUrl: youtubePosterUrl(youtubeId),
    sortOrder,
  };
}

export const defaultVideos: VideoItem[] = [
  ...defaultTracks.map((t, i) =>
    videoFrom(`v${t.id}`, t.title, t.artist, t.youtubeId, i + 1),
  ),
  videoFrom("v-billie", "Billie Jean", "Michael Jackson", "Zi_XLOBDo_Y", 10),
  videoFrom("v-thriller", "Thriller", "Michael Jackson", "sOnqjkJTMaA", 11),
  videoFrom("v-walk", "Walk This Way", "RUN-D.M.C. ft. Aerosmith", "4B_UYYPb-Gk", 12),
  videoFrom("v-girls", "Girls Just Want to Have Fun", "Cyndi Lauper", "PIb6AZdTr-A", 13),
  videoFrom("v-take", "Take On Me", "a-ha", "djV11Xbc914", 14),
];

export function createDefaultStore(): AppStore {
  return {
    content: { ...defaultContent, lineup: defaultContent.lineup.map((b) => ({ ...b })) },
    tracks: defaultTracks.map((t) => ({ ...t })),
    videos: defaultVideos.map((v) => ({ ...v })),
    rsvps: [
      {
        id: "sample-1",
        firstName: "Sample",
        lastName: "Guest",
        fullName: "Sample Guest (demo)",
        attend: "yes",
        guestCount: 2,
        companions: [{ firstName: "Demo", lastName: "Plusone" }],
        phone: "305-555-0100",
        email: "guest@example.com",
        dietary: "no",
        dietaryNotes: "",
        anythingElse: "no",
        specialRequests: "",
        status: "confirmed",
        confirmationSentAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        formStartedAt: new Date().toISOString(),
        formCompletedAt: new Date().toISOString(),
        abandoned: false,
      },
      {
        id: "sample-incomplete",
        firstName: "Started",
        lastName: "Form",
        fullName: "Started Form",
        attend: "yes",
        guestCount: 1,
        companions: [],
        phone: "",
        email: "almost@example.com",
        dietary: "",
        dietaryNotes: "",
        anythingElse: "",
        specialRequests: "",
        status: "incomplete",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        formStartedAt: new Date().toISOString(),
        formCompletedAt: null,
        lastFieldTouched: "email",
        abandoned: true,
      },
    ],
    messages: [],
    reminders: [],
    emailTemplates: emptyEmailTemplates(),
  };
}
