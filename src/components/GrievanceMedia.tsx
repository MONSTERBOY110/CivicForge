import React, { useState } from 'react';
import { Volume2, Camera } from 'lucide-react';

interface GrievanceMediaProps {
  inputType?: string;
  mediaUrl?: string | null;
  /** Small square thumbnail for dense rows (matrix table) instead of a full-width block. */
  compact?: boolean;
}

/**
 * Renders the media a citizen attached to a grievance: the photo for
 * inputType 'photo', an audio player for the original voice note on 'voice'.
 * Used on every surface where engineers and the MP triage grievances, so the
 * evidence travels with the complaint instead of living only on the citizen's
 * own timeline. Renders nothing when there is no media or the URL is dead
 * (a broken-image icon would read as a bug on stage).
 */
export const GrievanceMedia: React.FC<GrievanceMediaProps> = ({ inputType, mediaUrl, compact = false }) => {
  const [failed, setFailed] = useState(false);

  if (!mediaUrl || failed) return null;

  if (inputType === 'photo') {
    if (compact) {
      return (
        <img
          src={mediaUrl}
          alt="Citizen-submitted evidence"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-12 h-12 rounded-xl object-cover shrink-0"
        />
      );
    }
    return (
      <div className="neumorphic-concave p-2.5 rounded-[20px] space-y-2">
        <img
          src={mediaUrl}
          alt="Citizen-submitted evidence"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full max-h-64 object-cover rounded-[14px]"
        />
        <p className="text-[9px] font-black uppercase tracking-wider theme-text-muted flex items-center gap-1.5 px-1">
          <Camera className="w-3 h-3 theme-accent" />
          Citizen-submitted photo evidence
        </p>
      </div>
    );
  }

  if (inputType === 'voice') {
    // An audio player has no sensible 48px form; dense rows skip it.
    if (compact) return null;
    return (
      <div className="neumorphic-concave p-3 rounded-[20px] flex items-center gap-3">
        <Volume2 className="w-4 h-4 theme-accent shrink-0" />
        <audio
          controls
          preload="none"
          src={mediaUrl}
          onError={() => setFailed(true)}
          className="w-full h-9"
        />
      </div>
    );
  }

  return null;
};
