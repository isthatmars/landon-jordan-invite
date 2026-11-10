import type { AppStore, SiteContent, Track, VideoItem } from "./types";

export const defaultContent: SiteContent = {
  brandName: "Landon & Jordan's",
  heroScript: "Landon & Jordan's",
  heroChrome: "80s",
  heroSubtitle: "BIRTHDAY PARTY",
  heroInvite: "You're Invited!",
  eventDate: "SATURDAY DEC 19TH",
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
        "Lace up and hit the floor. Whether you're showing off a move or just riding the music, it's about a good time.",
      icon: "skate",
    },
    {
      id: "dinner",
      time: "7:30 PM – 9:00 PM",
      title: "DINNER & GOOD VIBES",
      description:
        "Take a break from the floor, grab a plate, and catch up over dinner.",
      icon: "dinner",
    },
    {
      id: "dj",
      time: "9:00 PM – MIDNIGHT",
      title: "THE DJ BATTLE & DANCE PARTY",
      description:
        "Two DJs go head-to-head with old-school hip-hop, R&B, South Florida bass, and 80s jams until midnight.",
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

const watch = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const defaultTracks: Track[] = [
  { id: "t1", title: "Beat It", artist: "Michael Jackson", color: "#e11d48", youtubeId: "oRdxUFDoQe0", audioUrl: watch("oRdxUFDoQe0"), sortOrder: 1 },
  { id: "t2", title: "It's My Cadillac (Got That Bass)", artist: "MC Nas-D & DJ Freaky Fred", color: "#22c55e", youtubeId: "ZXATR-UCNJk", audioUrl: watch("ZXATR-UCNJk"), sortOrder: 2 },
  { id: "t3", title: "Sucker M.C.'s", artist: "RUN-D.M.C.", color: "#3b82f6", youtubeId: "iOKMWSR2Aio", audioUrl: watch("iOKMWSR2Aio"), sortOrder: 3 },
  { id: "t4", title: "It's Like That", artist: "RUN-D.M.C.", color: "#60a5fa", youtubeId: "TLGWQfK-6DY", audioUrl: watch("TLGWQfK-6DY"), sortOrder: 4 },
  { id: "t5", title: "Push It", artist: "Salt-N-Pepa", color: "#ec4899", youtubeId: "vCadcBR95oU", audioUrl: watch("vCadcBR95oU"), sortOrder: 5 },
  { id: "t6", title: "Conga", artist: "Miami Sound Machine", color: "#eab308", youtubeId: "54ItEmCnP80", audioUrl: watch("54ItEmCnP80"), sortOrder: 6 },
  { id: "t7", title: "Purple Rain", artist: "Prince", color: "#a855f7", youtubeId: "TvnYmWpD_T8", audioUrl: watch("TvnYmWpD_T8"), sortOrder: 7 },
  { id: "t8", title: "Banned in the U.S.A.", artist: "2 Live Crew", color: "#f97316", youtubeId: "oNsdMFCXH9M", audioUrl: watch("oNsdMFCXH9M"), sortOrder: 8 },
  { id: "t9", title: "I Wanna Dance with Somebody", artist: "Whitney Houston", color: "#22d3ee", youtubeId: "eH3giaIzONA", audioUrl: watch("eH3giaIzONA"), sortOrder: 9 },
];

export const defaultVideos: VideoItem[] = [
  ...defaultTracks.map((t, i) => ({
    id: `v${t.id}`,
    title: t.title,
    artist: t.artist,
    posterUrl: "/images/crt-tv.jpg",
    youtubeId: t.youtubeId,
    videoUrl: t.audioUrl,
    sortOrder: i + 1,
  })),
  { id: "v-billie", title: "Billie Jean", artist: "Michael Jackson", posterUrl: "/images/crt-tv.jpg", youtubeId: "Zi_XLOBDo_Y", videoUrl: watch("Zi_XLOBDo_Y"), sortOrder: 10 },
  { id: "v-thriller", title: "Thriller", artist: "Michael Jackson", posterUrl: "/images/crt-tv.jpg", youtubeId: "sOnqjkJTMaA", videoUrl: watch("sOnqjkJTMaA"), sortOrder: 11 },
  { id: "v-walk", title: "Walk This Way", artist: "RUN-D.M.C. ft. Aerosmith", posterUrl: "/images/crt-tv.jpg", youtubeId: "4B_UYYPb-Gk", videoUrl: watch("4B_UYYPb-Gk"), sortOrder: 12 },
  { id: "v-girls", title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper", posterUrl: "/images/crt-tv.jpg", youtubeId: "PIb6AZdTr-A", videoUrl: watch("PIb6AZdTr-A"), sortOrder: 13 },
  { id: "v-take", title: "Take On Me", artist: "a-ha", posterUrl: "/images/crt-tv.jpg", youtubeId: "djV11Xbc914", videoUrl: watch("djV11Xbc914"), sortOrder: 14 },
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
  };
}
