import React, { useState, useEffect } from 'react';
import { GrievanceForm } from '../../components/GrievanceForm';
import axiosClient from '../../api/axiosClient';
import { ShieldAlert, ListTodo, MapPin, Calendar, Clock, Volume2, PlusCircle } from 'lucide-react';

interface Grievance {
  _id: string;
  category: string;
  description: string;
  inputType: string;
  mediaUrl: string;
  transcript: string;
  location: { address: string };
  urgencyScore: number;
  status: string;
  createdAt: string;
}

export const CitizenDashboard: React.FC = () => {
  const [myGrievances, setMyGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyGrievances = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/api/grievances/mine');
      if (response.data.success) {
        setMyGrievances(response.data.grievances);
      }
    } catch (err) {
      console.error('Failed to load my grievances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyGrievances();
  }, []);

  // Adapted badges to use clean Tailwind colors that compliment the mint-green/charcoal themes
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'verified':
        return 'theme-bg-card theme-accent border-current shadow-sm';
      case 'matched':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm';
      default:
        return 'theme-bg-canvas theme-text-muted border-current';
    }
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 75) return 'text-red-500 bg-red-50 border-red-100';
    if (score >= 45) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  return (
    <div className="theme-bg-canvas min-h-[calc(100vh-64px)] py-8 px-4 sm:px-6 lg:px-8 pb-32" id="citizen-dashboard">
      
      {/* Centralized Timeline Layout */}
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Upper Profile / Summary Header */}
        <div className="neumorphic-convex rounded-4xl p-8 text-center space-y-4 animate-fade-in">
          <div>
            <span className="theme-accent text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full neumorphic-concave inline-block mb-3">
              Citizen Hub
            </span>
            <h1 className="text-2xl font-black theme-text-main">Community Voice</h1>
            <p className="theme-text-muted text-xs mt-2 font-bold max-w-sm mx-auto">
              Your reports actively shape the city. Submit issues via text, photo, or voice.
            </p>
          </div>
          
          <div className="flex justify-center items-center gap-6 pt-2">
            <div className="text-center neumorphic-concave px-6 py-3 rounded-[20px]">
              <span className="block text-2xl font-black theme-accent">{myGrievances.length}</span>
              <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Total</span>
            </div>
            <div className="text-center neumorphic-concave px-6 py-3 rounded-[20px]">
              <span className="block text-2xl font-black text-emerald-600">
                {myGrievances.filter(g => g.status === 'resolved').length}
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Resolved</span>
            </div>
          </div>
        </div>

        {/* The Action Box (Create Post Style) */}
        <div className="neumorphic-convex rounded-4xl p-6 sm:p-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 neumorphic-concave rounded-full">
              <PlusCircle className="w-5 h-5 theme-accent" />
            </div>
            <h2 className="text-lg font-black theme-text-main">Lodge a New Grievance</h2>
          </div>
          {/* Note: We will need to update GrievanceForm.tsx next to match this style perfectly */}
          <GrievanceForm onSuccess={fetchMyGrievances} />
        </div>

        {/* Historic Submissions Timeline Feed */}
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center space-x-2 px-2">
            <ListTodo className="w-5 h-5 theme-text-muted" />
            <h2 className="text-sm font-black theme-text-muted uppercase tracking-wider">My Timeline</h2>
          </div>

          {loading ? (
            <div className="neumorphic-convex rounded-[28px] p-12 text-center">
              <div className="w-8 h-8 border-3 border-current theme-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="theme-text-muted font-black text-xs mt-3.5 uppercase tracking-wider">Syncing timeline...</p>
            </div>
          ) : myGrievances.length === 0 ? (
            <div className="neumorphic-convex rounded-[28px] p-12 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 mx-auto theme-text-muted opacity-50 mb-4" />
              <p className="theme-text-main text-sm font-black">No reports on your timeline yet.</p>
              <p className="theme-text-muted text-xs font-bold">Your submissions will appear here in chronological order.</p>
            </div>
          ) : (
            <div className="space-y-6 flex flex-col relative" id="grievance-history-list">
              {/* Vertical Timeline Line Indicator (Decorative) */}
              <div className="absolute left-6 top-4 bottom-4 w-1 bg-black/5 rounded-full z-0 hidden sm:block"></div>

              {myGrievances.map((g) => (
                <div key={g._id} className="neumorphic-convex rounded-[28px] p-6 space-y-4 hover:brightness-[1.02] transition-all duration-300 relative z-10 ml-0 sm:ml-12">
                  
                  {/* Timeline Node Connector (Desktop) */}
                  <div className="absolute -left-8 top-8 w-4 h-4 rounded-full neumorphic-convex border-2 border-white hidden sm:block"></div>

                  {/* Header: Category and Status */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest neumorphic-concave theme-text-muted px-3 py-1 rounded-xl inline-block">
                        {g.category}
                      </span>
                      <div className="text-[10px] theme-text-muted flex items-center space-x-1 font-bold pt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(g.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 border rounded-full ${getStatusBadge(g.status)}`}>
                      {g.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Body Text */}
                  <p className="theme-text-main text-sm font-bold leading-relaxed">{g.description}</p>

                  {/* Media attachments */}
                  {g.inputType === 'photo' && g.mediaUrl && (
                    <div className="rounded-[20px] overflow-hidden max-h-56 neumorphic-concave inline-flex items-center p-1.5 w-full">
                      <img src={g.mediaUrl} alt="Complaint Attachment" className="object-cover max-h-52 w-full rounded-[14px]" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {g.inputType === 'voice' && g.transcript && (
                    <div className="flex items-start space-x-2 neumorphic-concave p-4 rounded-[20px] text-xs theme-accent font-bold italic">
                      <Volume2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>"Transcribed: {g.transcript}"</span>
                    </div>
                  )}

                  <div className="h-px bg-black/5 rounded-full my-2"></div>

                  {/* Footer: Location & Calculated Urgency */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-1.5 theme-text-muted font-bold max-w-[60%]">
                      <MapPin className="w-4 h-4 theme-accent shrink-0" />
                      <span className="truncate">{g.location?.address}</span>
                    </div>

                    {/* Score Indicator */}
                    <div className={`flex items-center space-x-1.5 border px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${getUrgencyColor(g.urgencyScore)}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>AI Score: {g.urgencyScore}</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};