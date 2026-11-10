"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Track, VideoItem } from "@/lib/types";
import { holdScroll } from "@/lib/holdScroll";
import type { YoutubeHandle } from "./YoutubeScreen";

export type NowPlaying = {
  youtubeId: string;
  title: string;
  artist: string;
  /** Set when the TV is showing one of the party tapes. */
  trackId: string | null;
};

type Follow = "tapes" | "videos";

type PlaybackContextValue = {
  tracks: Track[];
  videos: VideoItem[];
  now: NowPlaying | null;
  playing: boolean;
  engaged: boolean;
  insertingId: string | null;
  playSerial: number;
  transportRevision: number;
  selectTape: (id: string) => void;
  stepTape: (dir: -1 | 1) => void;
  toggleDeck: () => void;
  toggleCurrent: () => void;
  stop: () => void;
  replay: (follow?: Follow) => void;
  seek: (seconds: number) => void;
  tuneVideo: (video: Pick<VideoItem, "youtubeId" | "title" | "artist">) => void;
  stepVideo: (dir: -1 | 1) => void;
  readTime: () => { current: number; duration: number };
  mute: (muted: boolean) => void;
  onEnded: () => void;
  onPlayingChange: (playing: boolean) => void;
  registerPlayer: (handle: YoutubeHandle | null) => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

function byOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Party songs share one YouTube id whether the guest picks the tape or the TV row. */
export function syncPartyVideos(tracks: Track[], videos: VideoItem[]) {
  const bySong = new Map(tracks.map((track) => [`${track.artist}\0${track.title}`, track]));
  return byOrder(videos).map((video) => {
    const track = bySong.get(`${video.artist}\0${video.title}`);
    if (!track?.youtubeId || video.youtubeId === track.youtubeId) return video;
    return {
      ...video,
      youtubeId: track.youtubeId,
      videoUrl: track.audioUrl || video.videoUrl,
    };
  });
}

function cueFrom(videos: VideoItem[]): NowPlaying | null {
  const first = videos.find((video) => video.youtubeId);
  if (!first) return null;
  return {
    youtubeId: first.youtubeId,
    title: first.title,
    artist: first.artist,
    trackId: null,
  };
}

export function PlaybackProvider({
  tracks: trackList,
  videos: videoList,
  children,
}: {
  tracks: Track[];
  videos: VideoItem[];
  children: ReactNode;
}) {
  const tracks = useMemo(() => byOrder(trackList), [trackList]);
  const videos = useMemo(() => syncPartyVideos(tracks, videoList), [tracks, videoList]);

  const [now, setNow] = useState<NowPlaying | null>(() => cueFrom(syncPartyVideos(byOrder(trackList), videoList)));
  const [playing, setPlaying] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [playSerial, setPlaySerial] = useState(0);
  const [transportRevision, setTransportRevision] = useState(0);

  const tracksRef = useRef(tracks);
  const videosRef = useRef(videos);
  const nowRef = useRef(now);
  const playingRef = useRef(playing);
  const engagedRef = useRef(engaged);
  const followRef = useRef<Follow>("videos");
  const playerRef = useRef<YoutubeHandle | null>(null);
  const pendingLoad = useRef<string | null>(null);
  const insertToken = useRef(0);
  const commandAt = useRef(0);
  const commandPlaying = useRef<boolean | null>(null);

  useEffect(() => {
    tracksRef.current = tracks;
    videosRef.current = videos;
    nowRef.current = now;
    playingRef.current = playing;
    engagedRef.current = engaged;
  }, [tracks, videos, now, playing, engaged]);

  useEffect(() => {
    return () => {
      insertToken.current += 1;
    };
  }, []);

  const markCommand = useCallback((isPlaying: boolean) => {
    commandAt.current = Date.now();
    commandPlaying.current = isPlaying;
  }, []);

  const matchTrack = useCallback((youtubeId: string) => {
    return tracksRef.current.find((track) => track.youtubeId && track.youtubeId === youtubeId) ?? null;
  }, []);

  const load = useCallback((youtubeId: string) => {
    if (!youtubeId) return;
    if (playerRef.current) playerRef.current.load(youtubeId);
    else pendingLoad.current = youtubeId;
  }, []);

  const beginInsert = useCallback((id: string) => {
    const token = ++insertToken.current;
    setInsertingId(id);
    window.setTimeout(() => {
      if (insertToken.current === token) setInsertingId(null);
    }, 700);
  }, []);

  const publish = useCallback((next: NowPlaying, follow: Follow, insert: boolean) => {
    holdScroll();
    markCommand(true);
    followRef.current = follow;
    engagedRef.current = true;
    setEngaged(true);
    nowRef.current = next;
    setNow(next);
    playingRef.current = true;
    setPlaying(true);
    setPlaySerial((n) => n + 1);
    if (insert && next.trackId) beginInsert(next.trackId);
    load(next.youtubeId);
  }, [beginInsert, load, markCommand]);

  const selectTape = useCallback((id: string) => {
    const track = tracksRef.current.find((item) => item.id === id);
    if (!track?.youtubeId) return;
    publish(
      {
        youtubeId: track.youtubeId,
        title: track.title,
        artist: track.artist,
        trackId: track.id,
      },
      "tapes",
      true,
    );
  }, [publish]);

  const tuneVideo = useCallback((video: Pick<VideoItem, "youtubeId" | "title" | "artist">) => {
    if (!video.youtubeId) return;
    const track = matchTrack(video.youtubeId);
    publish(
      {
        youtubeId: video.youtubeId,
        title: video.title,
        artist: video.artist,
        trackId: track?.id ?? null,
      },
      "videos",
      false,
    );
  }, [matchTrack, publish]);

  const stepTape = useCallback((dir: -1 | 1) => {
    const list = tracksRef.current;
    if (!list.length) return;
    const index = list.findIndex((track) => track.id === nowRef.current?.trackId);
    const start = index >= 0 ? index : dir === 1 ? -1 : 0;
    const next = list[(start + dir + list.length) % list.length];
    selectTape(next.id);
  }, [selectTape]);

  const stepVideo = useCallback((dir: -1 | 1) => {
    const list = videosRef.current.filter((video) => video.youtubeId);
    if (!list.length) return;
    const index = list.findIndex((video) => video.youtubeId === nowRef.current?.youtubeId);
    const start = index >= 0 ? index : dir === 1 ? -1 : 0;
    tuneVideo(list[(start + dir + list.length) % list.length]);
  }, [tuneVideo]);

  const rememberTape = useCallback(() => {
    const current = nowRef.current;
    if (!current?.youtubeId) return current;
    const track = matchTrack(current.youtubeId);
    if (!track || current.trackId === track.id) return current;
    const next = { ...current, trackId: track.id };
    nowRef.current = next;
    setNow(next);
    return next;
  }, [matchTrack]);

  const toggleDeck = useCallback(() => {
    holdScroll();
    if (playingRef.current) {
      markCommand(false);
      playerRef.current?.pause();
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    const current = nowRef.current;
    if (current?.trackId) {
      markCommand(true);
      engagedRef.current = true;
      setEngaged(true);
      playingRef.current = true;
      setPlaying(true);
      playerRef.current?.play();
      return;
    }
    if (engagedRef.current && followRef.current === "videos" && current?.youtubeId) {
      markCommand(true);
      rememberTape();
      playingRef.current = true;
      setPlaying(true);
      playerRef.current?.play();
      return;
    }
    const first = tracksRef.current[0];
    if (first) selectTape(first.id);
  }, [markCommand, rememberTape, selectTape]);

  const toggleCurrent = useCallback(() => {
    holdScroll();
    engagedRef.current = true;
    setEngaged(true);
    if (playingRef.current) {
      markCommand(false);
      playerRef.current?.pause();
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    const current = nowRef.current;
    if (!current?.youtubeId) {
      const first = videosRef.current.find((video) => video.youtubeId);
      if (first) tuneVideo(first);
      return;
    }
    markCommand(true);
    rememberTape();
    playingRef.current = true;
    setPlaying(true);
    playerRef.current?.play();
  }, [markCommand, rememberTape, tuneVideo]);

  const stop = useCallback(() => {
    holdScroll();
    markCommand(false);
    playerRef.current?.stop();
    playingRef.current = false;
    setPlaying(false);
    setTransportRevision((n) => n + 1);
  }, [markCommand]);

  const replay = useCallback((follow?: Follow) => {
    holdScroll();
    const current = nowRef.current;
    if (!current?.youtubeId) {
      const first = tracksRef.current[0];
      if (first) selectTape(first.id);
      return;
    }
    markCommand(true);
    engagedRef.current = true;
    setEngaged(true);
    const track = matchTrack(current.youtubeId);
    if (follow) followRef.current = follow;
    else if (track) followRef.current = "tapes";
    if (track && current.trackId !== track.id) {
      const next = { ...current, trackId: track.id };
      nowRef.current = next;
      setNow(next);
    }
    playingRef.current = true;
    setPlaying(true);
    playerRef.current?.replay();
  }, [markCommand, matchTrack, selectTape]);

  const seek = useCallback((seconds: number) => {
    holdScroll();
    playerRef.current?.seek(seconds);
  }, []);

  const readTime = useCallback(() => {
    return playerRef.current?.readTime() ?? { current: 0, duration: 0 };
  }, []);

  const mute = useCallback((muted: boolean) => {
    playerRef.current?.mute(muted);
  }, []);

  const onEnded = useCallback(() => {
    if (followRef.current === "tapes" && tracksRef.current.length) {
      const list = tracksRef.current;
      const index = list.findIndex((track) => track.id === nowRef.current?.trackId);
      const next = list[(Math.max(index, 0) + 1) % list.length];
      selectTape(next.id);
      return;
    }
    const list = videosRef.current.filter((video) => video.youtubeId);
    if (!list.length) return;
    const index = list.findIndex((video) => video.youtubeId === nowRef.current?.youtubeId);
    tuneVideo(list[(Math.max(index, 0) + 1) % list.length]);
  }, [selectTape, tuneVideo]);

  const onPlayingChange = useCallback((isPlaying: boolean) => {
    const recent = Date.now() - commandAt.current < 1200;
    if (recent && commandPlaying.current !== null && commandPlaying.current !== isPlaying) return;
    playingRef.current = isPlaying;
    setPlaying(isPlaying);
    if (isPlaying) rememberTape();
  }, [rememberTape]);

  const registerPlayer = useCallback((handle: YoutubeHandle | null) => {
    playerRef.current = handle;
    if (!handle || !pendingLoad.current) return;
    const id = pendingLoad.current;
    pendingLoad.current = null;
    handle.load(id);
  }, []);

  const value = useMemo<PlaybackContextValue>(() => ({
    tracks,
    videos,
    now,
    playing,
    engaged,
    insertingId,
    playSerial,
    transportRevision,
    selectTape,
    stepTape,
    toggleDeck,
    toggleCurrent,
    stop,
    replay,
    seek,
    tuneVideo,
    stepVideo,
    readTime,
    mute,
    onEnded,
    onPlayingChange,
    registerPlayer,
  }), [
    tracks,
    videos,
    now,
    playing,
    engaged,
    insertingId,
    playSerial,
    transportRevision,
    selectTape,
    stepTape,
    toggleDeck,
    toggleCurrent,
    stop,
    replay,
    seek,
    tuneVideo,
    stepVideo,
    readTime,
    mute,
    onEnded,
    onPlayingChange,
    registerPlayer,
  ]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const value = useContext(PlaybackContext);
  if (!value) throw new Error("usePlayback must be used within PlaybackProvider");
  return value;
}
