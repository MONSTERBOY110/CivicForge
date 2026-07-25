import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { HeatmapView } from '../../components/HeatmapView';
import { PriorityMatrixTable } from '../../components/PriorityMatrixTable';
import { SolutionCard } from '../../components/SolutionCard';
import {
  Landmark, Map, TableProperties, Cpu, FileText, CheckCircle,
  Loader2, Sparkles, ArrowRight, ShieldCheck, Check, IndianRupee,
  MapPin, Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Grievance {
  _id: string; category: string; description: string; inputType: string; mediaUrl: string;
  transcript: string; location: { lat: number; lng: number; address: string };
  stressScore: number; recurrenceCount: number; infrastructureGapScore: number;
  urgencyScore: number; aiPriorityScore: number; aiPriorityExplanation: string;
  status: string; citizen?: { name: string; email: string }; createdAt: string;
}

interface Solution {
  _id: string; title: string; description: string; techStack: string[];
  targetCategory: string; repoUrl?: string; demoUrl?: string; vouchCount: number;
  status: string; developer?: { name: string }; createdAt: string;
}

interface Blueprint {
  _id: string; mp: { name: string }; grievanceCluster: Grievance[];
  matchedSolution: Solution | null; generatedTitle: string; generatedSummary: string;
  estimatedBudget: string; status: 'draft' | 'approved'; createdAt: string;
}

type TabType = 'heatmap' | 'priority' | 'matchmaker' | 'blueprints';

export const MPDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('heatmap');
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [matchedSolutions, setMatchedSolutions] = useState<Solution[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loadingBlueprints, setLoadingBlueprints] = useState(false);
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const briefingAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const fetchGrievances = async () => {
    try {
      setLoadingGeneral(true);
      const response = await axiosClient.get('/api/priority-matrix');
      if (response.data.success) setGrievances(response.data.matrix);
    } catch (err) {
      toast.error('Grievance queue sync failed.');
    } finally {
      setLoadingGeneral(false);
    }
  };

  const fetchBlueprints = async () => {
    try {
      setLoadingBlueprints(true);
      const response = await axiosClient.get('/api/blueprints');
      if (response.data.success) setBlueprints(response.data.blueprints);
    } catch (err) {
      console.error('Failed to load blueprints:', err);
    } finally {
      setLoadingBlueprints(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
    fetchBlueprints();
  }, []);

  useEffect(() => {
    if (!selectedGrievance) {
      setMatchedSolutions([]);
      setSelectedSolution(null);
      return;
    }
    const fetchMatches = async () => {
      try {
        setLoadingMatches(true);
        const response = await axiosClient.get(`/api/matches/suggestions/${selectedGrievance._id}`);
        if (response.data.success) {
          setMatchedSolutions(response.data.suggestions);
          if (response.data.suggestions.length > 0) {
            setSelectedSolution(response.data.suggestions[0]);
          } else {
            setSelectedSolution(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch matched developer prototypes:', err);
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchMatches();
  }, [selectedGrievance]);

  const handleVerifyGrievance = async (id: string) => {
    try {
      const response = await axiosClient.patch(`/api/grievances/${id}/verify`);
      if (response.data.success) {
        toast.success('Grievance marked as officially verified!');
        fetchGrievances();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to verify grievance.');
    }
  };

  const handleGenerateProposal = async () => {
    if (!selectedGrievance) {
      toast.error('Please select an active grievance cluster first.');
      return;
    }
    try {
      setGeneratingProposal(true);
      const response = await axiosClient.post('/api/blueprints/generate', {
        grievanceIds: [selectedGrievance._id],
        solutionId: selectedSolution ? selectedSolution._id : undefined
      });

      if (response.data.success) {
        toast.success('Project Blueprint draft generated successfully via Gemini!');
        fetchBlueprints();
        fetchGrievances();
        setSelectedGrievance(null);
        setSelectedSolution(null);
        setActiveTab('blueprints');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gemini Proposal generation failed.');
    } finally {
      setGeneratingProposal(false);
    }
  };

  const handleApproveProposal = async (blueprintId: string) => {
    try {
      const response = await axiosClient.patch(`/api/blueprints/${blueprintId}/approve`);
      if (response.data.success) {
        toast.success('Proposal officially approved for direct constituency fund release!');
        fetchBlueprints();
        fetchGrievances();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to authorize proposal funding.');
    }
  };

  return (
    <div className="theme-bg-canvas min-h-[calc(100vh-64px)] py-8 px-4 sm:px-6 lg:px-8 pb-36" id="mp-dashboard">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* MP Executive Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0 neumorphic-convex p-8 rounded-4xl">
          <div>
            <span className="theme-accent text-xs font-black uppercase tracking-widest">Executive Control Panel</span>
            <h1 className="text-2xl font-black mt-2 theme-text-main tracking-tight">Constituency Analytics Station</h1>
            <p className="theme-text-muted text-xs font-bold mt-2 max-w-xl">
              Harnessing multi-source data fusion and Gemini AI models to prioritize community distress and fund digital prototypes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={async () => {
                const toastId = toast.loading('Triggering AI Prioritization Engine...');
                try {
                  await axiosClient.post('/api/priority-matrix/prioritize-all');
                  toast.success('AI Engine launched! Dashboards updating.', { id: toastId });
                  setTimeout(fetchGrievances, 3000);
                } catch (e) {
                  toast.error('Failed to trigger AI sync.', { id: toastId });
                }
              }}
              className="flex items-center gap-2 px-5 py-3.5 neumorphic-concave theme-accent hover:brightness-110 rounded-[18px] text-xs font-black uppercase transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Force AI Sync</span>
            </button>
            <button
              onClick={async () => {
                // Stop any briefing already playing so a re-click replaces it.
                if (briefingAudioRef.current) { briefingAudioRef.current.pause(); briefingAudioRef.current = null; }
                const toastId = toast.loading('Generating your audio briefing...');
                setLoadingBriefing(true);
                try {
                  const res = await axiosClient.get('/api/priority-matrix/briefing');
                  if (res.data.success && res.data.audioBase64) {
                    const audio = new Audio(`data:audio/mpeg;base64,${res.data.audioBase64}`);
                    briefingAudioRef.current = audio;
                    audio.play().catch(() => {});
                    toast.success('Playing your priority briefing.', { id: toastId });
                  } else {
                    toast.success(res.data.script || 'Briefing ready (voice unavailable).', { id: toastId });
                  }
                } catch (e) {
                  toast.error('Failed to generate briefing.', { id: toastId });
                } finally {
                  setLoadingBriefing(false);
                }
              }}
              className="flex items-center gap-2 px-5 py-3.5 neumorphic-concave theme-text-main hover:brightness-110 rounded-[18px] text-xs font-black uppercase transition-colors"
            >
              {loadingBriefing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              <span>Audio Briefing</span>
            </button>
            <div className="text-center neumorphic-concave px-6 py-3 rounded-[18px]">
              <span className="block text-xl font-black text-red-500">
                {grievances.filter(g => g.status === 'verified' || g.status === 'pending_review').length}
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Unresolved RFPs</span>
            </div>
            <div className="text-center neumorphic-concave px-6 py-3 rounded-[18px]">
              <span className="block text-xl font-black text-emerald-500">
                {blueprints.filter(b => b.status === 'approved').length}
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Funded Initiatives</span>
            </div>
          </div>
        </div>

        {/* Dynamic Workspace */}
        <div className="space-y-4">

          {/* 1. HEATMAP VIEW */}
          {activeTab === 'heatmap' && (
            <div className="neumorphic-convex p-6 sm:p-8 rounded-4xl animate-fade-in">
              <HeatmapView />
            </div>
          )}

          {/* 2. PRIORITY MATRIX VIEW */}
          {activeTab === 'priority' && (
            <div className="neumorphic-convex p-6 sm:p-8 rounded-4xl space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-black theme-text-main tracking-tight">Priority Matrix Engine</h3>
                <p className="text-xs theme-text-muted font-bold mt-1 max-w-2xl">Verified citizen demands compiled and ranked via compound score weights.</p>
              </div>

              {loadingGeneral ? (
                <div className="py-24 text-center">
                  <Loader2 className="w-8 h-8 theme-accent animate-spin mx-auto" />
                  <p className="theme-text-muted font-black text-xs mt-4 uppercase tracking-wider">Compiling demographic matrices...</p>
                </div>
              ) : (
                <PriorityMatrixTable 
                  data={grievances} 
                  selectedGrievanceId={selectedGrievance?._id}
                  onSelectGrievance={(g) => {
                    setSelectedGrievance(g);
                    toast.success(`Cluster selected! Switch to Matchmaker to view prototypes.`);
                  }}
                  onVerify={handleVerifyGrievance}
                  onRefresh={fetchGrievances}
                />
              )}
            </div>
          )}

          {/* 3. MATCHMAKER VIEW (Deconstructed Grid -> Vertical Stream) */}
          {activeTab === 'matchmaker' && (
            <div className="flex flex-col gap-8 items-start animate-fade-in">
              
              {/* Selected Grievance Node */}
              <div className="w-full neumorphic-convex rounded-4xl p-8 space-y-6">
                <div className="flex items-center space-x-2 border-b border-black/10 dark:border-white/10 pb-4">
                  <ShieldCheck className="w-6 h-6 theme-accent" />
                  <h3 className="text-xl font-black theme-text-main tracking-tight">Active Community RFP</h3>
                </div>

                {selectedGrievance ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest neumorphic-concave theme-text-muted px-4 py-1.5 rounded-lg">
                        {selectedGrievance.category}
                      </span>
                      <span className="text-xs font-black theme-accent flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> AI Priority: {selectedGrievance.urgencyScore}/100
                      </span>
                    </div>

                    <div className="space-y-2">
                       <p className="theme-text-main text-base font-bold leading-relaxed">{selectedGrievance.description}</p>
                      <p className="text-xs theme-text-muted font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Located near: {selectedGrievance.location?.address}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="neumorphic-concave p-4 rounded-[20px] text-center">
                        <span className="block text-lg font-black theme-text-main">{selectedGrievance.recurrenceCount}</span>
                        <span className="text-[9px] uppercase font-black theme-text-muted tracking-wider">Reports</span>
                      </div>
                      <div className="neumorphic-concave p-4 rounded-[20px] text-center">
                        <span className="block text-lg font-black text-red-500">{selectedGrievance.stressScore}%</span>
                        <span className="text-[9px] uppercase font-black theme-text-muted tracking-wider">Distress</span>
                      </div>
                      <div className="neumorphic-concave p-4 rounded-[20px] text-center">
                        <span className="block text-lg font-black theme-accent">{selectedGrievance.infrastructureGapScore}%</span>
                        <span className="text-[9px] uppercase font-black theme-text-muted tracking-wider">Deficit</span>
                      </div>
                    </div>

                    {selectedGrievance.inputType === 'voice' && selectedGrievance.transcript && (
                      <div className="p-4 neumorphic-concave rounded-[20px] text-sm theme-accent italic font-bold">
                        "Transcribed: {selectedGrievance.transcript}"
                      </div>
                    )}

                    <div className="pt-4 border-t border-black/10 dark:border-white/10">
                      <button
                        onClick={handleGenerateProposal}
                        disabled={generatingProposal}
                        className="w-full neumorphic-btn-accent py-4 px-6 rounded-[20px] flex items-center justify-center space-x-2 text-sm uppercase tracking-wider disabled:opacity-50"
                      >
                        {generatingProposal ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Compiling Executive Brief...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>Draft Executive Proposal via Gemini</span>
                          </>
                        )}
                      </button>
                      <p className="text-[10px] theme-text-muted text-center mt-3 font-black">Triggers Gemini AI to compile a funding brief using the selected prototype.</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-4">
                    <p className="theme-text-muted text-base font-bold">No community grievance node active.</p>
                    <button
                      onClick={() => setActiveTab('priority')}
                      className="neumorphic-concave hover:brightness-110 theme-text-main font-black px-6 py-3 rounded-2xl text-xs flex items-center space-x-2 mx-auto transition-all"
                    >
                      <span>Select Target from Priority Engine</span>
                      <ArrowRight className="w-4 h-4 theme-accent" />
                    </button>
                  </div>
                )}
              </div>

              {/* Matched Developer Prototypes */}
              <div className="w-full space-y-6">
                <div className="flex items-center space-x-2 px-2">
                  <Cpu className="w-6 h-6 theme-accent" />
                  <h3 className="text-xl font-black theme-text-main tracking-tight">Available Architecture Prototypes</h3>
                </div>

                {!selectedGrievance ? (
                  <div className="neumorphic-convex rounded-4xl p-16 text-center">
                    <p className="theme-text-muted text-sm font-bold">Target an RFP node above to query open-source architectures.</p>
                  </div>
                ) : loadingMatches ? (
                  <div className="neumorphic-convex rounded-4xl p-16 text-center">
                    <Loader2 className="w-8 h-8 theme-accent animate-spin mx-auto" />
                    <p className="theme-text-muted text-xs font-black mt-4 uppercase tracking-wider">Querying developer registry...</p>
                  </div>
                ) : matchedSolutions.length === 0 ? (
                  <div className="neumorphic-convex rounded-4xl p-16 text-center space-y-4">
                    <p className="theme-text-main text-base font-black">No developer prototypes registered for this sector.</p>
                    <button
                      onClick={handleGenerateProposal}
                      disabled={generatingProposal}
                      className="neumorphic-concave theme-text-main font-black px-6 py-3 rounded-2xl text-xs flex items-center space-x-2 mx-auto hover:brightness-110 transition-all"
                    >
                      <Sparkles className="w-4 h-4 theme-accent" />
                      <span>Proceed with general contractor brief</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {matchedSolutions.map((sol) => (
                      <SolutionCard
                        key={sol._id}
                        solution={sol as any}
                        userRole="mp"
                        onSelect={() => setSelectedSolution(sol)}
                        isSelected={selectedSolution?._id === sol._id}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 4. BLUEPRINT REVIEW VIEW */}
          {activeTab === 'blueprints' && (
            <div className="space-y-8 animate-fade-in">
              <div className="px-2">
                <h3 className="text-xl font-black theme-text-main tracking-tight">Executive Project Proposals</h3>
                <p className="text-sm theme-text-muted font-bold mt-1">Review AI-generated executive briefs based on active community demand.</p>
              </div>

              {loadingBlueprints ? (
                <div className="neumorphic-convex rounded-4xl p-16 text-center">
                  <Loader2 className="w-8 h-8 theme-accent animate-spin mx-auto" />
                  <p className="theme-text-muted text-xs font-black mt-4 uppercase tracking-wider">Syncing proposal catalogs...</p>
                </div>
              ) : blueprints.length === 0 ? (
                <div className="neumorphic-convex rounded-4xl p-16 text-center">
                  <p className="theme-text-muted text-base font-bold">No project proposal drafts generated.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {blueprints.map((b) => (
                    <div key={b._id} className="neumorphic-convex rounded-4xl p-8 space-y-6">
                      
                      {/* Blueprint Header */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black uppercase tracking-widest neumorphic-concave theme-text-muted px-3 py-1 rounded-md">
                              Executive Brief
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                              b.status === 'approved' 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {b.status === 'approved' ? 'Funded & Approved' : 'Awaiting Authorization'}
                            </span>
                          </div>
                          <h4 className="text-xl font-black theme-text-main leading-tight">{b.generatedTitle}</h4>
                        </div>

                        <div className="flex items-center space-x-2 neumorphic-concave text-theme-text-main font-bold px-4 py-2.5 rounded-2xl text-sm shrink-0">
                          <IndianRupee className="w-4 h-4 theme-accent" />
                          <span>Est. Budget: {b.estimatedBudget}</span>
                        </div>
                      </div>

                      {/* Matched items indicator */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 neumorphic-concave p-5 rounded-[20px] text-sm">
                        <div>
                          <span className="font-black theme-text-muted uppercase text-[10px] block mb-1">RFP Node Origin</span>
                          <span className="theme-text-main font-bold truncate block">
                            {b.grievanceCluster && b.grievanceCluster.length > 0 
                              ? `"${b.grievanceCluster[0].description.substring(0, 60)}..."`
                              : 'Standard cluster'}
                          </span>
                        </div>
                        <div>
                          <span className="font-black theme-text-muted uppercase text-[10px] block mb-1">Architecture Partner</span>
                          <span className="theme-text-main font-bold truncate block">
                            {b.matchedSolution ? b.matchedSolution.title : 'General Contractor'}
                          </span>
                        </div>
                      </div>

                      {/* Proposal Document Body */}
                      <div className="whitespace-pre-wrap leading-relaxed text-sm font-medium font-mono neumorphic-concave theme-text-main p-6 rounded-3xl max-h-96 overflow-y-auto custom-scrollbar border border-white/5">
                        {b.generatedSummary}
                      </div>

                      {/* Approval Actions */}
                      <div className="flex justify-between items-center pt-4">
                        <span className="text-xs theme-text-muted font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" /> Generated {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                        
                        {b.status === 'draft' ? (
                          <button
                            onClick={() => handleApproveProposal(b._id)}
                            className="neumorphic-btn-accent text-xs font-black uppercase tracking-wider px-6 py-3 rounded-2xl flex items-center space-x-2"
                          >
                            <Check className="w-4 h-4" />
                            <span>Authorize Funds</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-emerald-500 font-black text-sm">
                            <CheckCircle className="w-5 h-5" />
                            <span>Authorization Executed</span>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* FLOATING EXECUTIVE NAVIGATION HUB */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-fade-in">
        <div className="neumorphic-convex rounded-full p-2.5 flex items-center justify-between border border-white/5 bg-opacity-80 backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex items-center space-x-2 py-3 px-5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex-1 justify-center ${
              activeTab === 'heatmap' ? 'neumorphic-concave theme-accent scale-105' : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Heatmap</span>
          </button>
          <button
            onClick={() => setActiveTab('priority')}
            className={`flex items-center space-x-2 py-3 px-5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex-1 justify-center ${
              activeTab === 'priority' ? 'neumorphic-concave theme-accent scale-105' : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <TableProperties className="w-4 h-4" />
            <span className="hidden sm:inline">Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab('matchmaker')}
            className={`flex items-center space-x-2 py-3 px-5 rounded-full text-xs font-black uppercase tracking-wider transition-all relative flex-1 justify-center ${
              activeTab === 'matchmaker' ? 'neumorphic-concave theme-accent scale-105' : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">Match</span>
            {selectedGrievance && <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
          </button>
          <button
            onClick={() => setActiveTab('blueprints')}
            className={`flex items-center space-x-2 py-3 px-5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex-1 justify-center ${
              activeTab === 'blueprints' ? 'neumorphic-concave theme-accent scale-105' : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Briefs</span>
          </button>
        </div>
      </div>

    </div>
  );
};