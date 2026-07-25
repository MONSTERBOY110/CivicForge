import axios from 'axios';

/**
 * ElevenLabs Text-to-Speech.
 *
 * Turns a short line of text into natural spoken audio, returned as a base64
 * MP3 string that the frontend plays via a `data:audio/mpeg;base64,...` URI.
 * Base64 avoids any file-serving / cleanup / React-unmount issues.
 *
 * Used for:
 *   - Citizen submission confirmation (accessibility for low-literacy users)
 *   - The MP "Audio Briefing" that reads top-priority grievances aloud
 *
 * Degrades gracefully: returns null (never throws) when ELEVENLABS_API_KEY /
 * ELEVENLABS_VOICE_ID are missing or the API errors — callers simply skip audio.
 *
 * Env:
 *   ELEVENLABS_API_KEY   — your ElevenLabs API key
 *   ELEVENLABS_VOICE_ID  — a voice id from your ElevenLabs voice library
 */
export async function synthesizeSpeech(text: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.warn('ElevenLabs not configured (ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID) — skipping voice synthesis.');
    return null;
  }
  if (!text || !text.trim()) return null;

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  } catch (error: any) {
    console.error('ElevenLabs TTS error:', error?.response?.status || error?.message);
    return null;
  }
}
