import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { ShieldAlert, Sparkles, MapPin, Calendar, Cpu, Volume2, X, Plus, ListFilter } from 'lucide-react';
interface Problem {
  _id: string;
  category: string;
  description: string;
  inputType: 'text' | 'photo' | 'voice';
  mediaUrl?: string;
  transcript?: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  stressScore: number;
  recurrenceCount: number;
  infrastructureGapScore: number;
  urgencyScore: number;
  aiPriorityScore: number;
  aiPriorityExplanation: string;
  status: string;
  createdAt: string;
}

export const ProblemFeed: React.FC = () => {
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters and Sorting
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'ai-priority' | 'urgency' | 'newest'>('ai-priority');

  // Modal Solution Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryForSolution, setSelectedCategoryForSolution] = useState('water');
  const [selectedProblemDesc, setSelectedProblemDesc] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [docsUrl, setDocsUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = ['water', 'road', 'electricity', 'sanitation', 'health', 'education', 'other'];

  const fetchProblems = async (resetPage = false) => {
    try {
      const targetPage = resetPage ? 1 : page;
      if (resetPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('sort', sort);
      params.append('page', targetPage.toString());
      params.append('limit', '5');

      const response = await axiosClient.get(`/api/feed/problems?${params.toString()}`);
      if (response.data.success) {
        if (resetPage) {
          setProblems(response.data.problems);
        } else {
          setProblems(prev => {
            const existingIds = new Set(prev.map(p => p._id));
            const news = response.data.problems.filter((p: Problem) => !existingIds.has(p._id));
            return [...prev, ...news];
          });
        }
        setHasMore(response.data.hasMore);
      }
    } catch (err) {
      console.error('Failed to fetch problems feed:', err);
      toast.error('Failed to load civic problems feed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchProblems(true);
  }, [category, sort]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setTimeout(() => {
      fetchProblems(false);
    }, 50);
  };

  useEffect(() => {
    if (page > 1) {
      fetchProblems(false);
    }
  }, [page]);

  const openSubmitModal = (problem: Problem) => {
    setSelectedCategoryForSolution(problem.category);
    setSelectedProblemDesc(problem.description);
    setTitle(`Prototype Solution for ${problem.category.toUpperCase()}`);
    setDescription('');
    setTechStack('');
    setRepoUrl('');
    setDemoUrl('');
    setDocsUrl('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill out the title and description.');
      return;
    }

    try {
      setSubmitting(true);
      const formattedTech = techStack
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const response = await axiosClient.post('/api/solutions', {
        title: title.trim(),
        description: description.trim(),
        techStack: formattedTech,
        targetCategory: selectedCategoryForSolution,
        repoUrl: repoUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        docsUrl: docsUrl.trim() || undefined
      });

      if (response.data.success) {
        toast.success('Your civic prototype solution was registered! Matchmaking link established.');
        setIsModalOpen(false);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit solution.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getUrgencyBadgeColor = (score: number) => {
    if (score >= 70) {
      return 'text-[#E76F51] bg-[#FAF6ED] border-[#E76F51]/20 shadow-[inset_1px_1px_3px_rgba(231,111,81,0.1)]';
    } else if (score >= 40) {
      return 'text-amber-600 bg-[#FAF6ED] border-amber-500/20 shadow-[inset_1px_1px_3px_rgba(217,119,6,0.1)]';
    } else {
      return 'text-emerald-600 bg-[#FAF6ED] border-emerald-500/20 shadow-[inset_1px_1px_3px_rgba(16,185,129,0.1)]';
    }
  };

  return (
    <div className="theme-bg-canvas min-h-[calc(100vh-64px)] py-8 px-4 sm:px-6 lg:px-8 pb-32" id="problems-feed-page">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header Hero */}
        <div className="neumorphic-convex p-6 rounded-[28px] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 theme-accent" />
                <span className="theme-accent text-xs font-black uppercase tracking-widest">Developer Marketplace</span>
              </div>
              <h1 className="text-2xl font-black mt-1 theme-text-main uppercase tracking-tight">Civic Demands Feed</h1>
              <p className="theme-text-muted text-xs font-bold mt-1">Browse verified citizen complaints and register targeted solution prototypes.</p>
            </div>
            <div className="flex items-center space-x-3 neumorphic-concave p-3 rounded-[20px]">
              <div className="text-center px-4">
                <span className="block text-lg font-black theme-accent">{problems.length}</span>
                <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Listed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Sort Controllers */}
        <div className="neumorphic-convex rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center space-x-2 shrink-0 theme-text-muted">
            <ListFilter className="w-4 h-4 theme-accent" />
            <span className="text-xs font-black uppercase tracking-wider">Refine Queue</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full neumorphic-concave px-4 py-2.5 text-xs font-bold theme-text-main focus:outline-none"
            >
              <option value="">All Problem Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="w-full neumorphic-concave px-4 py-2.5 text-xs font-bold theme-text-main focus:outline-none"
            >
              <option value="ai-priority">Sort by AI Priority (Default)</option>
              <option value="urgency">Sort by Urgency Score</option>
              <option value="newest">Sort by Submission Date</option>
            </select>
          </div>
        </div>

        {/* Problems Queue */}
        {loading ? (
          <div className="neumorphic-convex rounded-[28px] p-16 text-center">
            <div className="w-8 h-8 border-3 border-current theme-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="theme-text-muted font-black text-xs mt-3.5 uppercase tracking-wider">Loading demands...</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="neumorphic-convex rounded-[28px] p-16 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 theme-text-muted mx-auto" />
            <p className="theme-text-main text-sm font-black">No active community problems matched your search.</p>
          </div>
        ) : (
          <div className="space-y-6" id="problems-feed-container">
            {problems.map((prob) => (
              <div key={prob._id} className="neumorphic-convex rounded-[28px] p-6 space-y-4 hover:brightness-110 transition-all duration-300 relative overflow-hidden">
                
                {/* Score badge in top corner */}
                <div className="absolute top-0 right-0 flex items-center neumorphic-concave rounded-bl-[20px] text-xs font-black tracking-tight">
                  <div className="px-3 py-2 theme-text-muted border-r border-black/10 dark:border-white/10">Spatial: {prob.urgencyScore}</div>
                  <div className="px-3 py-2 theme-accent flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> AI Priority: {prob.aiPriorityScore || 'N/A'}
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-widest neumorphic-concave theme-text-muted px-2.5 py-1 rounded-md">
                    {prob.category}
                  </span>
                  <span className="text-[10px] theme-text-muted flex items-center space-x-1 font-bold">
                    <Calendar className="w-3.5 h-3.5 theme-accent" />
                    <span>{new Date(prob.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>

                {prob.aiPriorityExplanation && (
                  <div className="neumorphic-concave p-3 rounded-2xl mb-2 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 theme-accent shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold theme-accent leading-relaxed">{prob.aiPriorityExplanation}</p>
                  </div>
                )}                

                <div className="space-y-2 pt-1.5">
                  <p className="theme-text-main text-sm font-bold leading-relaxed pr-24 sm:pr-0">{prob.description}</p>
                </div>

                {/* Scoring metrics breakdown grid */}
                <div className="grid grid-cols-3 gap-2.5 neumorphic-concave p-3.5 rounded-[20px] text-center">
                  <div><span className="block text-xs font-black text-red-500">{prob.stressScore}/100</span><span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Stress</span></div>
                  <div><span className="block text-xs font-black text-amber-500">×{prob.recurrenceCount}</span><span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Cluster</span></div>
                  <div><span className="block text-xs font-black theme-accent">{prob.infrastructureGapScore}/100</span><span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Gap</span></div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-1.5 text-xs font-black theme-text-muted">
                    <MapPin className="w-4 h-4 theme-accent shrink-0" />
                    <span className="truncate max-w-70 sm:max-w-md">{prob.location?.address}</span>
                  </div>
                  <button onClick={() => openSubmitModal(prob)} className="neumorphic-btn-accent text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-[14px] flex items-center justify-center space-x-1.5">
                    <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                    <span>Submit Solution</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Load More Pagination Trigger */}
        {hasMore && (
          <div className="text-center pt-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="neumorphic-convex theme-text-muted hover:text-(--accent-primary) rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? 'Syncing...' : 'View More Demands'}
            </button>
          </div>
        )}

      </div>

      {/* Submit Solution Overlay Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="solution-submission-modal">
          <div className="neumorphic-convex theme-text-main rounded-3xl w-full max-w-lg p-6 relative flex flex-col max-h-[90vh]">

            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 neumorphic-concave theme-text-muted hover:text-(--accent-primary) p-1.5 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 mb-4 shrink-0 pr-8">
              <span className="text-[10px] font-black uppercase tracking-widest neumorphic-concave theme-accent px-2.5 py-1 rounded-md inline-block">
                Targeting: {selectedCategoryForSolution.toUpperCase()}
              </span>
              <h2 className="text-lg font-black theme-text-main uppercase tracking-tight pt-1">Register Prototype Solution</h2>
              <div className="neumorphic-concave p-2.5 rounded-2xl mt-2 text-[11px] theme-text-muted font-medium leading-relaxed italic max-h-16 overflow-y-auto">
                "For issue: {selectedProblemDesc}"
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1.5">

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider theme-text-muted">Solution Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IoT Acoustic Pipeline Pressure Monitor"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full neumorphic-concave px-4 py-2.5 text-xs font-medium theme-text-main placeholder-[color:var(--text-muted)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider theme-text-muted">Technical Details & Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your prototype's technical features, how citizens run it, and hardware or cloud dependencies."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full neumorphic-concave p-4 text-xs font-medium theme-text-main placeholder-[color:var(--text-muted)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider theme-text-muted">Tech Stack (comma-separated tags)</label>
                <input
                  type="text"
                  placeholder="e.g. React, Python, YOLOv8, MQTT"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  className="w-full neumorphic-concave px-4 py-2.5 text-xs font-medium theme-text-main placeholder-[color:var(--text-muted)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider theme-text-muted">Source Repository URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full neumorphic-concave px-4 py-2.5 text-xs font-medium theme-text-main placeholder-[color:var(--text-muted)] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider theme-text-muted">Live Web Demo URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    className="w-full neumorphic-concave px-4 py-2.5 text-xs font-medium theme-text-main placeholder-[color:var(--text-muted)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pb-2">
                <label className="block text-xs font-black uppercase tracking-wider theme-text-muted">Developer Docs URL</label>
                <input
                  type="url"
                  placeholder="https://docs.example.org"
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  className="w-full neumorphic-concave px-4 py-2.5 text-xs font-medium theme-text-main placeholder-[color:var(--text-muted)] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end shrink-0 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="neumorphic-concave theme-text-muted hover:text-(--text-main) text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="neumorphic-btn-accent text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Register Solution'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
