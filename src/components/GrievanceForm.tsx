import React, { useState, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { FileText, Camera, Mic, MapPin, Upload, CheckCircle, Square, Trash2, Loader2 } from 'lucide-react';

const SECTORS = [
  { name: 'Behala & South Suburban', lat: 22.4981, lng: 88.3184, address: 'Roy Bahadur Road, Behala, Kolkata, WB' },
  { name: 'Salt Lake (Sector V)', lat: 22.5726, lng: 88.4339, address: 'Sector V, Salt Lake City, Kolkata, WB' },
  { name: 'Park Street & Chowringhee', lat: 22.5530, lng: 88.3510, address: '75 Park Street, Chowringhee, Kolkata, WB' },
  { name: 'Garia & Jadavpur', lat: 22.4714, lng: 88.3768, address: 'Raja SC Mullick Road, Garia, Kolkata, WB' }
];

interface GrievanceFormProps { onSuccess: () => void; }

export const GrievanceForm: React.FC<GrievanceFormProps> = ({ onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'photo' | 'voice'>('text');
  const [description, setDescription] = useState('');
  const [selectedSector, setSelectedSector] = useState(SECTORS[0]);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [customLat, setCustomLat] = useState('22.5726');
  const [customLng, setCustomLng] = useState('88.4339');
  const [customAddress, setCustomAddress] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustomLat(position.coords.latitude.toFixed(6));
          setCustomLng(position.coords.longitude.toFixed(6));
          setCustomAddress('Current GPS Coordinates (Verified)');
          setUseCustomLocation(true);
        },
        (err) => { setError('Could not access current location. Using preset sectors instead.'); }
      );
    } else { setError('Geolocation not supported by your browser.'); }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
  };
  const triggerFileSelect = () => fileInputRef.current?.click();
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob); setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start(); setIsRecording(true); setError(null);
    } catch (err) { setError('Microphone access is required to record voice notes.'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };
  const deleteRecording = () => { setAudioBlob(null); setAudioUrl(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); setError(null); setSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.append('inputType', activeTab);
      if (useCustomLocation) {
        formData.append('lat', customLat); formData.append('lng', customLng); formData.append('address', customAddress || 'Custom Coordinate Area, Kolkata');
      } else {
        formData.append('lat', selectedSector.lat.toString()); formData.append('lng', selectedSector.lng.toString()); formData.append('address', selectedSector.address);
      }
      if (activeTab === 'text') {
        if (!description.trim()) throw new Error('Please fill in a description of the issue.');
        formData.append('description', description);
      } else if (activeTab === 'photo') {
        if (!description.trim()) throw new Error('Please provide context description along with the photo.');
        if (!photoFile) throw new Error('Please upload or drag a photo.');
        formData.append('description', description); formData.append('file', photoFile);
      } else if (activeTab === 'voice') {
        if (!audioBlob) throw new Error('Please record a voice note before submitting.');
        formData.append('file', audioBlob, 'voice-grievance.wav');
      }

      const response = await axiosClient.post('/api/grievances', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      if (response.data.success) {
        setSuccessMsg(`Grievance submitted successfully! AI classified this under "${response.data.grievance.category.toUpperCase()}" with an urgency of ${response.data.grievance.urgencyScore}/100.`);
        // Play the ElevenLabs spoken confirmation (accessibility) if the backend
        // returned one. Imperative Audio survives this component's unmount below.
        const audioB64 = response.data.grievance.audioBase64;
        if (audioB64) {
          try { new Audio(`data:audio/mpeg;base64,${audioB64}`).play().catch(() => {}); } catch { /* no-op */ }
        }
        setDescription(''); setPhotoFile(null); setPhotoPreview(null); setAudioBlob(null); setAudioUrl(null);
        setTimeout(() => { onSuccess(); setSuccessMsg(null); }, 3000);
      }
    } catch (err: any) { setError(err.message || err.response?.data?.message || 'Failed to submit grievance.'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="neumorphic-convex rounded-3xl overflow-hidden">
      {/* Tab selectors */}
      <div className="flex bg-black/5 dark:bg-white/5 p-2">
        <button type="button" onClick={() => { setActiveTab('text'); setError(null); }} className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'text' ? 'neumorphic-concave theme-accent' : 'theme-text-muted hover:theme-text-main'}`}>
          <FileText className="w-4 h-4" /><span>Text Issue</span>
        </button>
        <button type="button" onClick={() => { setActiveTab('photo'); setError(null); }} className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'photo' ? 'neumorphic-concave theme-accent' : 'theme-text-muted hover:theme-text-main'}`}>
          <Camera className="w-4 h-4" /><span>Upload Photo</span>
        </button>
        <button type="button" onClick={() => { setActiveTab('voice'); setError(null); }} className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'voice' ? 'neumorphic-concave theme-accent' : 'theme-text-muted hover:theme-text-main'}`}>
          <Mic className="w-4 h-4" /><span>Voice Note</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && <div className="bg-red-500/10 text-red-500 text-xs px-4 py-3 rounded-xl border border-red-500/20 font-bold">{error}</div>}
        {successMsg && <div className="bg-emerald-500/10 text-emerald-500 text-xs px-4 py-4 rounded-xl border border-emerald-500/20 flex items-start space-x-2.5 font-bold"><CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /><span>{successMsg}</span></div>}

        {/* Location Selection */}
        <div className="space-y-3.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-wider theme-text-muted flex items-center space-x-1.5"><MapPin className="w-4 h-4 theme-accent" /><span>Problem Location</span></label>
            <button type="button" onClick={detectLocation} className="text-xs theme-accent hover:brightness-125 font-bold flex items-center space-x-1 hover:underline cursor-pointer"><MapPin className="w-3.5 h-3.5" /><span>Use My GPS</span></button>
          </div>
          {!useCustomLocation ? (
            <div>
              <select value={SECTORS.findIndex(s => s.name === selectedSector.name)} onChange={(e) => setSelectedSector(SECTORS[Number(e.target.value)])} className="w-full neumorphic-concave px-4 py-3 text-sm font-bold theme-text-main border-none focus:outline-none">
                {SECTORS.map((sector, idx) => <option key={sector.name} value={idx}>{sector.name}</option>)}
              </select>
              <p className="text-[10px] theme-text-muted mt-2 font-bold italic">Coordinates: {selectedSector.lat}, {selectedSector.lng} • {selectedSector.address}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 neumorphic-concave p-4 rounded-2xl border border-white/5">
              <div><label className="text-[9px] uppercase tracking-wider font-black theme-text-muted">Custom Area Name</label><input type="text" required value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} className="w-full bg-transparent border-b border-black/20 dark:border-white/20 px-1 py-2 text-xs theme-text-main focus:outline-none focus:border-theme-accent" /></div>
              <div><label className="text-[9px] uppercase tracking-wider font-black theme-text-muted">Lat, Lng</label><input type="text" readOnly value={`${customLat}, ${customLng}`} className="w-full bg-transparent border-b border-transparent px-1 py-2 text-xs theme-text-muted cursor-not-allowed" /></div>
              <div className="sm:col-span-2 text-right"><button type="button" onClick={() => setUseCustomLocation(false)} className="text-[10px] theme-text-muted hover:theme-accent font-bold hover:underline">Switch back to preset sectors</button></div>
            </div>
          )}
        </div>

        {/* Inputs */}
        {activeTab === 'text' && (
          <div className="space-y-2"><label className="text-xs font-black uppercase tracking-wider theme-text-muted">Describe Problem</label><textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide a clear description..." className="w-full neumorphic-concave px-4 py-3.5 text-sm theme-text-main font-medium" /></div>
        )}
        {activeTab === 'photo' && (
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-xs font-black uppercase tracking-wider theme-text-muted">Explain Image</label><input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Briefly describe what this photo shows" className="w-full neumorphic-concave px-4 py-3 text-sm theme-text-main font-medium" /></div>
            <div className="space-y-2"><label className="text-xs font-black uppercase tracking-wider theme-text-muted">Attach Photo</label>
              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden flex items-center justify-center neumorphic-concave p-2"><img src={photoPreview} alt="Preview" className="object-contain max-h-60 rounded-xl" /><button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="absolute top-4 right-4 neumorphic-convex theme-accent p-2 rounded-full hover:scale-110"><Trash2 className="w-4 h-4" /></button></div>
              ) : (
                <div onDragOver={handleDragOver} onDrop={handleDrop} onClick={triggerFileSelect} className="border-2 border-dashed border-theme-text-muted/30 hover:border-theme-accent rounded-2xl p-8 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all"><Upload className="w-8 h-8 theme-text-muted" /><span className="text-xs font-bold theme-text-main">Drag photo here, or click to browse</span><input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" /></div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'voice' && (
          <div className="neumorphic-concave rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
            <div><span className="text-xs font-black uppercase tracking-wider theme-text-main">Voice Note Recorder</span><p className="text-[10px] theme-text-muted font-bold mt-1 max-w-sm">Google Gemini will transcribe and classify your voice automatically.</p></div>
            <div className="flex items-center justify-center">
              {!isRecording && !audioUrl ? (
                <button type="button" onClick={startRecording} className="flex items-center space-x-2 neumorphic-btn-accent py-3 px-6 rounded-full text-[11px]"><Mic className="w-4 h-4" /><span>Start Recording</span></button>
              ) : isRecording ? (
                <button type="button" onClick={stopRecording} className="flex items-center space-x-2 neumorphic-concave theme-accent py-3 px-6 rounded-full animate-pulse border border-theme-accent/30"><Square className="w-4 h-4 fill-current" /><span>Stop Recording</span></button>
              ) : (
                <div className="flex items-center space-x-3 neumorphic-convex p-3 rounded-2xl"><audio src={audioUrl || ''} controls className="h-9 rounded-lg" /><button type="button" onClick={deleteRecording} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-full transition-all"><Trash2 className="w-4 h-4" /></button></div>
              )}
            </div>
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="w-full neumorphic-btn-accent py-4 px-4 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 disabled:opacity-50">
          {isSubmitting ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Analysis running...</span></>) : (<span>Submit Grievance to CivicForge</span>)}
        </button>
      </form>
    </div>
  );
};