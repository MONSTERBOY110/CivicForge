import React, { useState } from 'react';
import { ArrowUpDown, MapPin, Sparkles, Check, RefreshCw } from 'lucide-react';

interface Grievance {
  _id: string; category: string; description: string; inputType: string; mediaUrl: string;
  transcript: string; location: { lat: number; lng: number; address: string };
  stressScore: number; recurrenceCount: number; infrastructureGapScore: number;
  urgencyScore: number; aiPriorityScore: number; aiPriorityExplanation: string;
  status: string; citizen?: { name: string; email: string }; createdAt: string;
  topSolution?: { _id: string; title: string; developer?: { name: string }; vouchCount: number; aiMatchScore?: number; } | null;
  weeklyMomentum?: number;
}

interface PriorityMatrixTableProps {
  data: Grievance[];
  onSelectGrievance: (grievance: Grievance) => void;
  selectedGrievanceId?: string;
  onVerify: (id: string) => Promise<void>;
  onRefresh?: () => void;
}

export const PriorityMatrixTable: React.FC<PriorityMatrixTableProps> = ({ 
  data, onSelectGrievance, selectedGrievanceId, onVerify, onRefresh 
}) => {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'aiPriorityScore' | 'recurrenceCount' | 'stressScore' | 'infrastructureGapScore'>('aiPriorityScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSort = (field: any) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const getAIBadge = (score: number) => {
    if (score >= 80) return 'bg-red-500/20 text-red-400 border border-red-500/30';
    if (score >= 50) return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  };

  const filteredData = data
    .filter(item => { 
      const matchCat = categoryFilter ? item.category === categoryFilter : true;
      const matchStatus = statusFilter ? item.status === statusFilter : true;
      const matchSearch = searchQuery 
        ? item.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
          item.location.address.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchCat && matchStatus && matchSearch;
    })
    .sort((a, b) => {
      if (a.status === 'resolved' && b.status !== 'resolved') return 1;
      if (a.status !== 'resolved' && b.status === 'resolved') return -1;
      const valA = a[sortField] || 0;
      const valB = b[sortField] || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

  return (
    <div className="space-y-6">
      {/* 1. Filters & Search Grid */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-3">
          <input
            type="text"
            placeholder="Search by keywords or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full neumorphic-concave px-5 py-3 text-sm theme-text-main placeholder-opacity-50 font-medium rounded-2xl"
          />
          <button 
            onClick={handleRefresh}
            className="neumorphic-convex theme-text-muted hover:theme-text-main hover:brightness-110 px-5 py-3 rounded-2xl transition-all flex items-center justify-center shrink-0"
            title="Refresh Matrix"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="neumorphic-concave px-5 py-3 text-sm theme-text-main font-bold focus:outline-none sm:w-56 rounded-2xl"
        >
          <option value="">All Categories</option>
          <option value="water">Water</option>
          <option value="road">Roads / Potholes</option>
          <option value="electricity">Electricity</option>
          <option value="sanitation">Sanitation / Waste</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="neumorphic-concave px-5 py-3 text-sm theme-text-main font-bold focus:outline-none sm:w-56 rounded-2xl"
        >
          <option value="">All Statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="verified">Verified</option>
          <option value="matched">Matched (Draft Proposal)</option>
          <option value="resolved">Resolved (Deployed)</option>
        </select>
      </div>

      {/* 2. Priority Ranked Table */}
      <div className="neumorphic-convex rounded-[28px] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" id="priority-table">
            <thead>
              <tr className="bg-black/20 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-[10px] font-black uppercase tracking-widest theme-text-muted">
                <th className="py-5 px-6">Issue Diagnostics</th>
                <th className="py-5 px-4 text-center cursor-pointer hover:brightness-125 transition-colors select-none" onClick={() => handleSort('aiPriorityScore')}>
                  <div className="flex items-center justify-center space-x-1.5 theme-accent">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Engine</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-5 px-4 text-center cursor-pointer hover:brightness-125 transition-colors select-none" onClick={() => handleSort('recurrenceCount')}>
                  <div className="flex items-center justify-center space-x-1.5">
                    <span>Cluster Size</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </th>
                <th className="py-5 px-4 text-center cursor-pointer hover:brightness-125 transition-colors select-none" onClick={() => handleSort('stressScore')}>
                  <div className="flex items-center justify-center space-x-1.5">
                    <span>Distress</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </th>
                <th className="py-5 px-4 text-center cursor-pointer hover:brightness-125 transition-colors select-none" onClick={() => handleSort('infrastructureGapScore')}>
                  <div className="flex items-center justify-center space-x-1.5">
                    <span>Data Deficit</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </th>
                <th className="py-5 px-5 text-left">Matched Solution Vector</th>
                <th className="py-5 px-6 text-center">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm theme-text-muted font-bold">
                    No community grievances found matching matrix parameters.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isSelected = selectedGrievanceId === item._id;
                  const isResolved = item.status === 'resolved';

                  return (
                    <tr 
                      key={item._id} 
                      className={`transition-all duration-300 cursor-pointer 
                        ${isResolved ? 'opacity-40 grayscale hover:opacity-75' : 'hover:bg-black/5 dark:hover:bg-white/5'} 
                        ${isSelected && !isResolved ? 'bg-theme-accent/10 border-l-4 border-theme-accent' : ''}
                      `}
                      onClick={() => onSelectGrievance(item)}
                    >
                      <td className="py-5 px-6 max-w-sm">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="neumorphic-concave theme-text-muted text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                              {item.category}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                              item.status === 'pending_review' ? 'bg-amber-500/20 text-amber-500' :
                              item.status === 'verified' ? 'bg-blue-500/20 text-blue-400' :
                              item.status === 'matched' ? 'bg-indigo-500/20 text-indigo-400' :
                              item.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-500' :
                              'neumorphic-concave theme-text-muted'
                            }`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className={`text-sm font-bold theme-text-main line-clamp-2 leading-relaxed ${isResolved ? 'line-through opacity-50' : ''}`}>
                            {item.description}
                          </p>
                          <div className="flex items-center space-x-1.5 theme-text-muted text-xs">
                            <MapPin className="w-3.5 h-3.5 theme-accent" />
                            <span className="truncate font-bold">{item.location?.address}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 px-4 text-center">
                        <div className="flex flex-col items-center space-y-1 relative group">
                          <span className={`text-sm font-black px-3.5 py-1.5 rounded-full ${getAIBadge(item.aiPriorityScore)} flex items-center gap-1.5`}>
                            {item.aiPriorityScore || 0}
                          </span>
                          {item.aiPriorityExplanation && !isResolved && (
                            <div className="absolute top-10 w-56 p-3 bg-black/90 text-white text-[10px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-left border border-white/10">
                              {item.aiPriorityExplanation}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-5 px-4 text-center">
                        <span className="text-sm font-black theme-text-main">{item.recurrenceCount}</span>
                      </td>

                      <td className="py-5 px-4 text-center">
                        <span className="text-sm font-black theme-text-main">{item.stressScore}%</span>
                      </td>

                      <td className="py-5 px-4 text-center">
                        <span className="text-sm font-black theme-accent">{item.infrastructureGapScore}%</span>
                      </td>

                      <td className="py-5 px-5 max-w-xs text-left">
                        {item.topSolution ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black theme-text-main block truncate max-w-37.5">{item.topSolution.title}</span>
                              {(item.topSolution?.aiMatchScore ?? 0) > 0 && (
                                <span className="text-[9px] font-black bg-theme-accent/20 theme-accent px-1.5 rounded" title="AI Match Score">{item.topSolution?.aiMatchScore ?? 0}%</span>
                              )}
                            </div>
                            <div className="text-[10px] theme-text-muted font-bold">
                              Vendor: {item.topSolution.developer?.name || 'Anonymous'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] theme-text-muted font-bold italic">No active vectors</span>
                        )}
                      </td>

                      <td className="py-5 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-3">
                          {isResolved ? (
                            <span className="text-xs text-emerald-500 font-bold flex items-center space-x-1">
                              <Check className="w-4 h-4 font-extrabold" />
                              <span>Closed</span>
                            </span>
                          ) : (
                            <>
                              {item.status === 'pending_review' ? (
                                <button
                                  onClick={() => onVerify(item._id)}
                                  className="text-xs neumorphic-btn-accent font-black px-4 py-2 rounded-[14px] flex items-center space-x-1.5 cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Verify</span>
                                </button>
                              ) : (
                                <span className="text-xs theme-text-muted font-bold flex items-center space-x-1 opacity-50">
                                  <Check className="w-4 h-4" />
                                  <span>Verified</span>
                                </span>
                              )}
                              <button
                                onClick={() => onSelectGrievance(item)}
                                className="text-xs theme-text-muted hover:theme-text-main neumorphic-concave px-4 py-2 rounded-[14px] font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer hover:brightness-125 transition-all"
                              >
                                <Sparkles className="w-4 h-4 theme-accent" />
                                <span>Target</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};