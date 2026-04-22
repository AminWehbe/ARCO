import { useEffect, useRef } from "react";

const TRACKS = {
  "8BIT":       "/music/track_8bit.mp3",
  "ARCADE":     "/music/track_arcade.mp3",
  "CELL THEME": "/music/track_perfectcell.mp3",
};

// Manages a looping background audio track with adjustable volume
export function useMusic(music, volume = 0.6) {
  const audioRef   = useRef(null);
  const currentKey = useRef(null);

  useEffect(() => {
    if (music === "OFF") {
      audioRef.current?.pause();
      return;
    }

    if (currentKey.current !== music) {
      audioRef.current?.pause();
      audioRef.current        = new Audio(TRACKS[music]);
      audioRef.current.loop   = true;
      audioRef.current.volume = volume;
      currentKey.current      = music;
    }

    const tryPlay = () => audioRef.current?.play().catch(() => {});
    tryPlay();
    document.addEventListener("click", tryPlay, { once: true });
    return () => document.removeEventListener("click", tryPlay);
  }, [music]);

  // Update volume live without restarting the track
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);
}
