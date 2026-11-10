import type { AppStore, SiteContent, Track, VideoItem } from "./types";

export const defaultContent: SiteContent = {
  brandName: "Landon & Jordan's",
  heroScript: "Landon & Jordan's",
  heroChrome: "80s",
  heroSubtitle: "BIRTHDAY PARTY",
  heroInvite: "You're Invited!",
  eventDate: "FRIDAY DEC 19TH",
  eventVenue: "THE RINK MIAMI, FL",
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
        "Lace up and hit the floor. Roller skating, photo moments, and that first blast of classic 80s heat.",
      icon: "skate",
    },
    {
      id: "dinner",
      time: "7:30 PM – 9:00 PM",
      title: "DINNER & GOOD VIBES",
      description:
        "Sit down, catch up, and enjoy dinner with the crew. Good food, better conversation.",
      icon: "dinner",
    },
    {
      id: "dj",
      time: "9:00 PM – MIDNIGHT",
      title: "THE DJ BATTLE & DANCE PARTY",
      description:
        "Two DJs go head-to-head. Dance floor stays open until midnight — bring that Flyest 80s Look.",
      icon: "dj",
    },
  ],
  dressCode: "80s FRESH!",
  dressCodePrize: "Prize for the Flyest 80s Look",
  privateNote: "PRIVATE PARTY | INVITED GUESTS ONLY",
  rsvpHeadline: "RSVP",
  rsvpSubhead:
    "CONFIRM YOUR ATTENDANCE FOR LANDON & JORDAN'S 80S BIRTHDAY PARTY!",
  footerTagline: "GOOD MUSIC. GREAT COMPANY. CLASSIC 80s VIBES.",
  updatedAt: new Date().toISOString(),
};

export const defaultTracks: Track[] = [
  {
    id: "t1",
    title: "Beat It",
    artist: "Michael Jackson",
    color: "#e11d48",
    audioUrl: "/audio/beat-it.wav",
    sortOrder: 1,
  },
  {
    id: "t2",
    title: "My Cadillac Got That Bass",
    artist: "Party Classic",
    color: "#22c55e",
    audioUrl: "/audio/cadillac.wav",
    sortOrder: 2,
  },
  {
    id: "t3",
    title: "Sucker M.C.'s",
    artist: "RUN-D.M.C.",
    color: "#3b82f6",
    audioUrl: "/audio/sucker-mcs.wav",
    sortOrder: 3,
  },
  {
    id: "t4",
    title: "Push It",
    artist: "Salt-N-Pepa",
    color: "#ec4899",
    audioUrl: "/audio/push-it.wav",
    sortOrder: 4,
  },
  {
    id: "t5",
    title: "Conga",
    artist: "Miami Sound Machine",
    color: "#eab308",
    audioUrl: "/audio/conga.wav",
    sortOrder: 5,
  },
  {
    id: "t6",
    title: "Purple Rain",
    artist: "Prince",
    color: "#a855f7",
    audioUrl: "/audio/purple-rain.wav",
    sortOrder: 6,
  },
];

export const defaultVideos: VideoItem[] = [
  {
    id: "v1",
    title: "Thriller",
    artist: "Michael Jackson",
    posterUrl: "/images/crt-tv.jpg",
    videoUrl: "",
    sortOrder: 1,
  },
  {
    id: "v2",
    title: "Billie Jean",
    artist: "Michael Jackson",
    posterUrl: "/images/crt-tv.jpg",
    videoUrl: "",
    sortOrder: 2,
  },
  {
    id: "v3",
    title: "Purple Rain",
    artist: "Prince",
    posterUrl: "/images/crt-tv.jpg",
    videoUrl: "",
    sortOrder: 3,
  },
  {
    id: "v4",
    title: "Conga",
    artist: "Miami Sound Machine",
    posterUrl: "/images/crt-tv.jpg",
    videoUrl: "",
    sortOrder: 4,
  },
];

export function createDefaultStore(): AppStore {
  return {
    content: { ...defaultContent, lineup: defaultContent.lineup.map((b) => ({ ...b })) },
    tracks: defaultTracks.map((t) => ({ ...t })),
    videos: defaultVideos.map((v) => ({ ...v })),
    rsvps: [
      {
        id: "sample-1",
        fullName: "Sample Guest (demo)",
        attend: "yes",
        guestCount: 2,
        phone: "305-555-0100",
        email: "guest@example.com",
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
        fullName: "Started Form",
        attend: "yes",
        guestCount: 1,
        phone: "",
        email: "almost@example.com",
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
