import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Heart, MessageSquare, Share2, ExternalLink, MapPin, Trash2, Send, Layers, Search, CheckCircle, TrendingUp, Award } from 'lucide-react';

const CommentThread: React.FC<{ solutionId: string; user: any; onCommentCountChange: (newCount: number) => void; }> = ({ solutionId, user, onCommentCountChange }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/api/solutions/${solutionId}/comments`);
      if (response.data.success) { setComments(response.data.comments); onCommentCountChange(response.data.comments.length); }
    } catch (err) {} finally { setLoading(false); }
  };
  useEffect(() => { fetchComments(); }, [solutionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newComment.trim()) return;
    try {
      setSubmitting(true);
      const response = await axiosClient.post(`/api/solutions/${solutionId}/comments`, { text: newComment });
      if (response.data.success) { toast.success('Comment posted!'); setNewComment(''); fetchComments(); }
    } catch (err: any) { toast.error('Failed to post comment.'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const response = await axiosClient.delete(`/api/comments/${commentId}`);
      if (response.data.success) { toast.success('Comment deleted.'); fetchComments(); }
    } catch (err: any) { toast.error('Failed to delete comment.'); }
  };

  return (
    <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 space-y-4 animate-fade-in">
      <h4 className="text-xs font-black uppercase tracking-wider theme-accent">Discussion Forum</h4>
      {(user?.role === 'citizen' || user?.role === 'developer') ? (
        <form onSubmit={handleSubmit} className="flex gap-2.5">
          <input type="text" placeholder="Type your feedback..." value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={submitting} className="flex-1 neumorphic-concave px-4 py-2.5 text-xs theme-text-main focus:outline-none" />
          <button type="submit" disabled={submitting || !newComment.trim()} className="neumorphic-btn-accent rounded-xl px-4 flex items-center justify-center disabled:opacity-50"><Send className="w-3.5 h-3.5" /></button>
        </form>
      ) : (<p className="text-[10px] theme-text-muted font-bold italic">Evaluators cannot comment.</p>)}

      {loading ? (<div className="py-4 text-center"><div className="w-4 h-4 border-2 border-current theme-accent border-t-transparent rounded-full animate-spin mx-auto"></div></div>) : comments.length === 0 ? (<p className="text-xs theme-text-muted font-bold py-1">No feedback yet.</p>) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
          {comments.map((comment) => {
            const commentAuthorId = typeof comment.user === 'object' ? comment.user._id : comment.user;
            const isAuthor = commentAuthorId === user?.id || commentAuthorId?._id === user?.id;
            return (
              <div key={comment._id} className="neumorphic-concave rounded-2xl p-4 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black theme-text-main">{comment.user?.name || 'Anonymous'}</span>
                    <span className="text-[8px] font-black uppercase bg-black/5 dark:bg-white/5 px-1.5 py-0.5 theme-text-muted rounded">{comment.user?.role}</span>
                    <span className="text-[10px] theme-text-muted font-bold">{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs theme-text-main font-medium leading-relaxed">{comment.text}</p>
                </div>
                {isAuthor && (<button onClick={() => handleDelete(comment._id)} className="theme-text-muted hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SolutionFeed: React.FC = () => {
  const { user } = useAuth();
  const [solutions, setSolutions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [expandedSolutions, setExpandedSolutions] = useState<{ [id: string]: boolean }>({});
  const categories = ['water', 'road', 'electricity', 'sanitation', 'health', 'education', 'other'];

  const fetchFeed = async (resetPage = false) => {
    try {
      const targetPage = resetPage ? 1 : page;
      if (resetPage) setLoading(true); else setLoadingMore(true);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (region) params.append('region', region);
      params.append('page', targetPage.toString()); params.append('limit', '5');

      const response = await axiosClient.get(`/api/feed/solutions?${params.toString()}`);
      if (response.data.success) {
        if (resetPage) setSolutions(response.data.solutions);
        else { setSolutions(prev => { const existing = new Set(prev.map(s => s._id)); const news = response.data.solutions.filter((s:any) => !existing.has(s._id)); return [...prev, ...news]; }); }
        setHasMore(response.data.hasMore);
      }
    } catch (err) { toast.error('Failed to retrieve feeds.'); } finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { setPage(1); fetchFeed(true); }, [category, region]);
  useEffect(() => { if (page > 1) fetchFeed(false); }, [page]);
  const loadMore = () => { setPage(page + 1); setTimeout(() => fetchFeed(false), 50); };

  const handleVouchToggle = async (id: string) => {
    if (user?.role === 'mp') { toast.error('MPs cannot vouch.'); return; }
    setSolutions(prev => prev.map(s => { if (s._id === id) { return { ...s, vouched: !s.vouched, vouchCount: s.vouched ? Math.max(0, s.vouchCount - 1) : s.vouchCount + 1 }; } return s; }));
    try {
      const response = await axiosClient.post(`/api/solutions/${id}/vouch`);
      if (response.data.success) { setSolutions(prev => prev.map(s => { if (s._id === id) { return { ...s, vouched: response.data.vouched, vouchCount: response.data.solution.vouchCount }; } return s; })); }
    } catch (err) { fetchFeed(true); toast.error('Vouch failed.'); }
  };

  const handleShare = async (id: string) => {
    try {
      const response = await axiosClient.post(`/api/solutions/${id}/share`);
      if (response.data.success) {
        setSolutions(prev => prev.map(s => { if (s._id === id) { return { ...s, shareCount: response.data.shareCount }; } return s; }));
        navigator.clipboard.writeText(response.data.shareableLink); toast.success('Link copied!');
      }
    } catch (err) {}
  };

  const toggleComments = (id: string) => setExpandedSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  const updateCardCommentCount = (id: string, newCount: number) => setSolutions(prev => prev.map(s => { if (s._id === id) return { ...s, commentCount: newCount }; return s; }));

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20';
      case 'matched': return 'bg-blue-500/20 text-blue-500 border border-blue-500/20';
      case 'under_review': return 'bg-amber-500/20 text-amber-500 border border-amber-500/20';
      default: return 'neumorphic-concave theme-text-muted';
    }
  };

  return (
    <div className="theme-bg-canvas min-h-[calc(100vh-64px)] py-8 px-4 sm:px-6 lg:px-8 pb-32" id="solutions-feed-page">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="neumorphic-convex p-8 rounded-4xl overflow-hidden animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center space-x-2"><TrendingUp className="w-4 h-4 theme-accent animate-pulse" /><span className="theme-accent text-xs font-black uppercase tracking-widest">Social Feed Layer</span></div>
              <h1 className="text-2xl font-black mt-2 theme-text-main uppercase tracking-tight">Community Solutions Feed</h1>
              <p className="theme-text-muted text-xs mt-1 font-bold">Explore tech prototypes. Log feedback and vouch to support developers.</p>
            </div>
            <div className="flex items-center space-x-3 neumorphic-concave p-3 rounded-[20px]">
              <div className="text-center px-4"><span className="block text-xl font-black theme-accent">{solutions.length}</span><span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Listed</span></div>
            </div>
          </div>
        </div>

        <div className="neumorphic-convex rounded-3xl p-4 flex flex-col md:flex-row md:items-center gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center space-x-2 shrink-0 theme-text-muted"><Search className="w-4 h-4 theme-accent" /><span className="text-xs font-black uppercase tracking-wider">Refine Feed</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full neumorphic-concave px-4 py-2.5 text-xs font-bold theme-text-main focus:outline-none appearance-none cursor-pointer">
              <option value="">All Categories</option>{categories.map(cat => (<option key={cat} value={cat}>{cat.toUpperCase()}</option>))}
            </select>
            <input type="text" placeholder="Search by Developer Region..." value={region} onChange={(e) => setRegion(e.target.value)} className="w-full neumorphic-concave px-4 py-2.5 text-xs font-bold theme-text-main focus:outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="neumorphic-convex rounded-4xl p-16 text-center"><div className="w-8 h-8 border-3 border-current theme-accent border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : solutions.length === 0 ? (
          <div className="neumorphic-convex rounded-4xl p-16 text-center space-y-3 animate-fade-in"><Layers className="w-10 h-10 theme-text-muted mx-auto" /><p className="theme-text-main text-sm font-black">No solutions matched your criteria.</p></div>
        ) : (
          <div className="space-y-6 flex flex-col relative" id="solutions-feed-container">
            {/* Timeline Connector Line */}
            <div className="absolute left-8 top-8 bottom-8 w-1 bg-black/5 dark:bg-white/5 rounded-full z-0 hidden sm:block"></div>

            {solutions.map((sol) => (
              <div key={sol._id} className="neumorphic-convex rounded-4xl p-8 space-y-4 hover:brightness-110 transition-all duration-300 relative z-10 sm:ml-16">
                
                {/* Timeline Node */}
                <div className="absolute -left-10 top-12 w-4 h-4 rounded-full neumorphic-convex border-2 border-theme-accent hidden sm:block"></div>

                {sol.status === 'deployed' && (<div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-2xl shadow-sm flex items-center space-x-1"><Award className="w-3.5 h-3.5" /><span>Deployed</span></div>)}

                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2"><span className="text-xs theme-text-muted font-bold">Created by</span><span className="text-sm font-black theme-text-main">{sol.developer?.name || 'Anonymous'}</span></div>
                    {sol.developer?.region && (<div className="flex items-center space-x-1 text-[10px] theme-text-muted font-bold"><MapPin className="w-3 h-3 theme-accent" /><span>{sol.developer.region}</span></div>)}
                  </div>
                  <div className="flex items-center space-x-2 shrink-0"><span className="neumorphic-concave theme-text-muted text-[9px] font-black uppercase px-2 py-0.5 rounded-md">{sol.targetCategory}</span><span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${getStatusBadgeColor(sol.status)}`}>{sol.status.replace('_', ' ')}</span></div>
                </div>

                <div className="space-y-2"><h3 className="text-xl font-black theme-text-main tracking-tight">{sol.title}</h3><p className="theme-text-muted text-sm font-medium leading-relaxed">{sol.description}</p></div>

                {sol.techStack && sol.techStack.length > 0 && (<div className="flex flex-wrap gap-1.5 pt-1">{sol.techStack.map((tech: string, idx: number) => (<span key={idx} className="text-[10px] font-black font-mono neumorphic-concave theme-text-main px-2 py-0.5 rounded-md">{tech}</span>))}</div>)}

                {(sol.repoUrl || sol.demoUrl || sol.docsUrl) && (
                  <div className="flex flex-wrap gap-4 text-xs font-bold pt-2">
                    {sol.repoUrl && (<a href={sol.repoUrl} target="_blank" rel="noopener noreferrer" className="theme-text-muted hover:theme-accent flex items-center space-x-1 transition-all"><ExternalLink className="w-3.5 h-3.5" /><span>Source Code</span></a>)}
                    {sol.demoUrl && (<a href={sol.demoUrl} target="_blank" rel="noopener noreferrer" className="theme-text-muted hover:theme-accent flex items-center space-x-1 transition-all"><ExternalLink className="w-3.5 h-3.5" /><span>Live Demo</span></a>)}
                    {sol.docsUrl && (<a href={sol.docsUrl} target="_blank" rel="noopener noreferrer" className="theme-text-muted hover:theme-accent flex items-center space-x-1 transition-all"><ExternalLink className="w-3.5 h-3.5" /><span>Docs</span></a>)}
                  </div>
                )}

                <div className="h-px bg-black/10 dark:bg-white/10 my-4"></div>

                <div className="flex items-center justify-between text-xs font-bold theme-text-muted">
                  <div className="flex items-center space-x-4">
                    <button onClick={() => handleVouchToggle(sol._id)} className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl transition-all ${sol.vouched ? 'neumorphic-concave theme-accent' : 'neumorphic-convex theme-text-muted hover:theme-text-main'}`}>
                      <Heart className={`w-4 h-4 ${sol.vouched ? 'fill-current' : ''}`} /><span>{sol.vouchCount || 0} Support</span>
                    </button>
                    <button onClick={() => toggleComments(sol._id)} className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl transition-all ${expandedSolutions[sol._id] ? 'neumorphic-concave theme-accent' : 'neumorphic-convex theme-text-muted hover:theme-text-main'}`}>
                      <MessageSquare className="w-4 h-4" /><span>{sol.commentCount || 0} Feedback</span>
                    </button>
                  </div>
                  <button onClick={() => handleShare(sol._id)} className="flex items-center space-x-1.5 neumorphic-convex theme-text-muted hover:theme-text-main px-3 py-2 rounded-xl transition-all"><Share2 className="w-4 h-4" /><span>{sol.shareCount || 0}</span></button>
                </div>

                {expandedSolutions[sol._id] && (<CommentThread solutionId={sol._id} user={user} onCommentCountChange={(newCount) => updateCardCommentCount(sol._id, newCount)} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};