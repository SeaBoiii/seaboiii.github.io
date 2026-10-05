import { useEffect, useRef, useState } from "react";
import "./Soundtrack.css";

const soundtrackUrl = "/portfolio-assets/media/quiet-mechanisms.mp3";

/** Optional music: never attach a source until a deliberate button activation. */
export default function Soundtrack() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const requested = useRef(false);
  const requestId = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function stop() {
    requested.current = false;
    requestId.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      // Abandon a still-pending download as well as its play promise.
      if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
        audio.removeAttribute("src");
        audio.load();
      }
    }
    setPlaying(false);
    setLoading(false);
  }

  useEffect(() => {
    const audio = audioRef.current;
    const pauseForVisibility = () => {
      if (document.hidden) stop();
    };
    const pauseForPageExit = () => stop();
    document.addEventListener("visibilitychange", pauseForVisibility);
    window.addEventListener("pagehide", pauseForPageExit);
    return () => {
      document.removeEventListener("visibilitychange", pauseForVisibility);
      window.removeEventListener("pagehide", pauseForPageExit);
      requested.current = false;
      requestId.current += 1;
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
    };
  }, []);

  function reportError() {
    if (!requested.current) return;
    requested.current = false;
    requestId.current += 1;
    const audio = audioRef.current;
    audio?.pause();
    audio?.removeAttribute("src");
    audio?.load();
    setPlaying(false);
    setLoading(false);
    setError("Sound could not start. Select the sound button to try again.");
  }

  function toggle() {
    if (requested.current) {
      stop();
      setError("");
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    requested.current = true;
    const attempt = ++requestId.current;
    setError("");
    setLoading(true);
    audio.volume = 0.25;
    if (!audio.getAttribute("src")) audio.src = soundtrackUrl;
    void audio.play().then(
      () => {
        // An old promise must never pause a newer, deliberately started request.
        if (!requested.current || document.hidden) audio.pause();
      },
      () => {
        if (attempt === requestId.current && requested.current) reportError();
      },
    );
  }

  return (
    <div className="soundtrack">
      <button
        className="soundtrack-toggle"
        type="button"
        aria-label={
          loading ? "Cancel loading background music" : "Background music"
        }
        aria-pressed={playing}
        aria-describedby={error ? "soundtrack-status" : undefined}
        data-loading={loading || undefined}
        onClick={toggle}
        title={
          loading
            ? "Cancel loading sound"
            : playing
              ? "Turn sound off"
              : "Turn sound on"
        }
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 9h4l5-4v14l-5-4H4V9Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {playing ? (
            <>
              <path
                d="M16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </>
          ) : (
            <path
              d="m17 9 5 6m0-6-5 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}
        </svg>
        <span className="soundtrack-label">
          {loading ? "Loading" : playing ? "Sound on" : "Sound off"}
        </span>
      </button>
      <span
        id="soundtrack-status"
        className={error ? "soundtrack-error" : "sr-only"}
        role="status"
        aria-live="polite"
      >
        {error || (loading ? "Loading background music." : "")}
      </span>
      <audio
        ref={audioRef}
        preload="none"
        loop
        aria-hidden="true"
        onPlaying={() => {
          const audio = audioRef.current;
          if (!requested.current || document.hidden) {
            audio?.pause();
            return;
          }
          setLoading(false);
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
          if (!requested.current) setLoading(false);
        }}
        onError={reportError}
      />
    </div>
  );
}
