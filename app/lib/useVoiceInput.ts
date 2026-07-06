"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice input over the Web Speech API (SpeechRecognition). For this audience —
 * mobile-first merchants, often low-literacy / second-language — SPEAKING is
 * more natural than typing, so the composer leads with a mic. Where the browser
 * / MiniPay webview doesn't support the API, `supported` is false and callers
 * fall back to the text box. A server-side speech-to-text (record → transcribe)
 * can later replace this behind the same {start, stop, listening} interface
 * without touching the UI.
 */
export function useVoiceInput(opts?: { lang?: string; onResult?: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<unknown>(null);
  const onResultRef = useRef(opts?.onResult);
  onResultRef.current = opts?.onResult;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setSupported(Boolean(SR));
  }, []);

  const stop = useCallback(() => {
    try {
      (recRef.current as { stop?: () => void } | null)?.stop?.();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as unknown as Record<string, new () => unknown>).SpeechRecognition ||
      (window as unknown as Record<string, new () => unknown>).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR() as {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: (e: unknown) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
    };
    rec.lang =
      opts?.lang ||
      (typeof navigator !== "undefined" ? navigator.language : "en-US") ||
      "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: unknown) => {
      const ev = e as {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      };
      let finalText = "";
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0].transcript;
        if (r.isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        onResultRef.current?.(finalText.trim());
        setInterim("");
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setInterim("");
    } catch {
      setListening(false);
    }
  }, [opts?.lang]);

  useEffect(
    () => () => {
      try {
        (recRef.current as { abort?: () => void } | null)?.abort?.();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  return { listening, supported, interim, start, stop };
}
