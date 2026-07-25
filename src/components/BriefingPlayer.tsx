import React, { useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { Volume2, Play, Pause, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Lang = 'en' | 'hi';

// Devanagari needs a touch more size than Latin to read at the same optical weight.
const LANGUAGES: { code: Lang; label: string; labelClass: string; aria: string }[] = [
  { code: 'en', label: 'EN', labelClass: 'text-[10px] tracking-wider', aria: 'Play briefing in English' },
  { code: 'hi', label: 'अ', labelClass: 'text-sm leading-none', aria: 'Play briefing in Hindi' }
];

/**
 * The MP "Audio Briefing" control.
 *
 * Idle it is a labelled button. On the first press the SAME control becomes a
 * three-circle player: language, play/pause, language. Pressing the inactive
 * language stops playback and replays that language from the start. When
 * playback finishes the control reverts to its labelled idle state.
 *
 * Audio is cached per language only while the player is active, then dropped on
 * revert, so a briefing requested after the MP verifies grievances is generated
 * fresh instead of replaying a stale one.
 */
export const BriefingPlayer: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingLang, setLoadingLang] = useState<Lang | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Partial<Record<Lang, string>>>({});

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // Back to the labelled button, forgetting cached audio.
  const resetToIdle = () => {
    stopAudio();
    cacheRef.current = {};
    setIsActive(false);
    setIsPlaying(false);
    setLoadingLang(null);
  };

  // Never leave audio playing after the dashboard unmounts.
  useEffect(() => () => stopAudio(), []);

  const playBase64 = (base64: string) => {
    stopAudio();
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audioRef.current = audio;
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => resetToIdle();
    audio.play().catch(() => setIsPlaying(false));
  };

  const loadAndPlay = async (target: Lang) => {
    setLang(target);

    const cached = cacheRef.current[target];
    if (cached) {
      playBase64(cached);
      return;
    }

    // Stop immediately so switching language feels responsive while we generate.
    stopAudio();
    setIsPlaying(false);
    setLoadingLang(target);

    try {
      const res = await axiosClient.get(`/api/priority-matrix/briefing?lang=${target}`);
      if (res.data.success && res.data.audioBase64) {
        // Trust the language the server actually produced. Translation can be
        // unavailable (rate limit), in which case English is spoken and saying
        // otherwise would leave Hindi highlighted over English audio.
        const delivered: Lang = res.data.lang === 'hi' ? 'hi' : 'en';
        if (delivered !== target) {
          toast.error('Hindi is unavailable right now, playing English instead.');
        }
        setLang(delivered);
        cacheRef.current[delivered] = res.data.audioBase64;
        playBase64(res.data.audioBase64);
      } else {
        // ElevenLabs unconfigured, or nothing to brief: show the script instead.
        toast.success(res.data.script || 'Briefing ready (voice unavailable).');
        resetToIdle();
      }
    } catch {
      toast.error('Failed to generate briefing.');
      resetToIdle();
    } finally {
      setLoadingLang(null);
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) {
      // Nothing loaded (or it finished): regenerate the current language.
      loadAndPlay(lang);
      return;
    }
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  };

  if (!isActive) {
    return (
      <button
        onClick={() => { setIsActive(true); loadAndPlay('en'); }}
        className="flex items-center gap-2 px-5 py-3.5 neumorphic-concave theme-text-main hover:brightness-110 rounded-[18px] text-xs font-black uppercase transition-colors"
      >
        <Volume2 className="w-4 h-4" />
        <span>Audio Briefing</span>
      </button>
    );
  }

  const renderLanguage = (entry: typeof LANGUAGES[number]) => {
    const isCurrent = lang === entry.code;
    return (
      <button
        key={entry.code}
        type="button"
        onClick={() => loadAndPlay(entry.code)}
        aria-label={entry.aria}
        aria-pressed={isCurrent}
        title={entry.code === 'en' ? 'English' : 'हिन्दी'}
        className={`w-9 h-9 rounded-full flex items-center justify-center font-black transition-all neumorphic-concave ${
          isCurrent ? 'theme-accent scale-105' : 'theme-text-muted hover:theme-text-main'
        }`}
      >
        {loadingLang === entry.code
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <span className={entry.labelClass}>{entry.label}</span>}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="Audio briefing player"
      className="flex items-center gap-2 px-2 py-1.5 neumorphic-concave rounded-full"
      id="briefing-player"
    >
      {renderLanguage(LANGUAGES[0])}

      <button
        type="button"
        onClick={togglePlayback}
        disabled={loadingLang !== null}
        aria-label={isPlaying ? 'Pause briefing' : 'Play briefing'}
        className="w-9 h-9 rounded-full flex items-center justify-center neumorphic-btn-accent disabled:opacity-60"
      >
        {isPlaying
          ? <Pause className="w-4 h-4 fill-current" />
          : <Play className="w-4 h-4 fill-current" />}
      </button>

      {renderLanguage(LANGUAGES[1])}
    </div>
  );
};
