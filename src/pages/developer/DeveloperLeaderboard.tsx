import React, { useState, useEffect, useMemo } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Award, MapPin, Search, Trophy, Star, Heart, Laptop, Flame,
  UserCheck, Crown, Medal, TrendingUp, Users, Zap
} from 'lucide-react';

interface LeaderboardEntry {
  developer: { _id: string; name: string; email: string; region?: string; };
  totalVouches: number;
  solutionCount: number;
  hasDeployedBadge: boolean;
  rank: number;
}

export const DeveloperLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTooltipForDevId, setShowTooltipForDevId] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/api/leaderboard/developers');
      if (response.data.success) {
        setLeaderboard(response.data.leaderboard);
      }
    } catch (err) {
      toast.error('Failed to load developer leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const query = searchQuery.toLowerCase();
    return leaderboard.filter(entry => 
      entry.developer?.name?.toLowerCase().includes(query) || 
      entry.developer?.region?.toLowerCase().includes(query)
    );
  }, [leaderboard, searchQuery]);

  const myRank = useMemo(() => {
    if (!user) return null;
    return leaderboard.find(entry => entry.developer._id === user.id) || null;
  }, [leaderboard, user]);

  const totalVouchesAll = useMemo(() => leaderboard.reduce((sum, e) => sum + e.totalVouches, 0), [leaderboard]);
  const totalSolutionsAll = useMemo(() => leaderboard.reduce((sum, e) => sum + e.solutionCount, 0), [leaderboard]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-sm">
            <Crown className="w-4.5 h-4.5" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 shadow-sm">
            <Medal className="w-4.5 h-4.5" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-600/20 text-orange-500 border border-orange-600/40 shadow-sm">
            <Medal className="w-4.5 h-4.5" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-9 h-9 rounded-full neumorphic-concave text-xs font-mono font-black theme-text-muted">
            #{rank}
          </div>
        );
    }
  };

  const isMyEntry = (devId: string) => user?.id === devId;

  return (
    <div className="theme-bg-canvas min-h-[calc(100vh-64px)] py-8 px-4 sm:px-6 lg:px-8 pb-32" id="leaderboard-page">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header Hero */}
        <div className="neumorphic-convex p-6 rounded-[28px] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 theme-accent fill-current animate-pulse" />
                <span className="theme-accent text-xs font-black uppercase tracking-widest">Public Leaderboard</span>
              </div>
              <h1 className="text-2xl font-black mt-1 theme-text-main uppercase tracking-tight">Top Civic Developers</h1>
              <p className="theme-text-muted text-xs font-bold mt-1">
                Celebrating open-source contributors who build high-impact prototypes.
              </p>
            </div>
            <div className="flex items-center space-x-3 neumorphic-concave p-3 rounded-[18px]">
              <div className="text-center px-3 border-r border-black/10 dark:border-white/10">
                <span className="block text-lg font-black theme-text-main">
                  {leaderboard.filter(e => e.hasDeployedBadge).length}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Deployed</span>
              </div>
              <div className="text-center px-3 border-r border-black/10 dark:border-white/10">
                <span className="block text-lg font-black theme-accent">{leaderboard.length}</span>
                <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Developers</span>
              </div>
              <div className="text-center px-3">
                <span className="block text-lg font-black theme-text-main">{totalVouchesAll}</span>
                <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">Vouches</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Rank Card */}
        {myRank && user?.role === 'developer' && (
          <div className="neumorphic-convex border border-theme-accent/30 rounded-[28px] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden">
            <div className="flex items-center space-x-4 relative z-10">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 theme-accent" />
                <span className="text-xs font-black uppercase tracking-wider theme-accent">Your Standing</span>
              </div>
              <div className="h-6 w-px bg-black/10 dark:bg-white/10 hidden sm:block"></div>
              <div className="flex items-center space-x-3">
                {getRankBadge(myRank.rank)}
                <div>
                  <span className="text-sm font-black theme-text-main">{myRank.developer.name}</span>
                  <div className="flex items-center space-x-3 text-[10px] font-bold theme-text-muted">
                    <span className="flex items-center space-x-0.5">
                      <Heart className="w-3 h-3 fill-current" />
                      <span>{myRank.totalVouches} vouches</span>
                    </span>
                    <span className="flex items-center space-x-0.5">
                      <Laptop className="w-3 h-3" />
                      <span>{myRank.solutionCount} solutions</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="neumorphic-concave px-4 py-2 rounded-xl text-center relative z-10">
              <span className="text-2xl font-black theme-accent">#{myRank.rank}</span>
              <span className="block text-[9px] font-black uppercase tracking-wider theme-text-muted">of {leaderboard.length}</span>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="neumorphic-convex rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center space-x-2 shrink-0 theme-text-muted">
            <Search className="w-4 h-4 theme-accent" />
            <span className="text-xs font-black uppercase tracking-wider">Search Developers</span>
          </div>
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full neumorphic-concave px-4 py-2.5 text-xs font-medium theme-text-main focus:outline-none"
            />
          </div>
        </div>

        {/* Top 3 Podium Displays */}
        {filteredLeaderboard.length >= 3 && !searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 2nd Place Card */}
            <div className={`neumorphic-convex rounded-[28px] p-5 flex flex-col items-center text-center space-y-3 relative md:order-1 order-2 ${isMyEntry(filteredLeaderboard[1].developer._id) ? 'ring-1 ring-theme-accent' : ''}`}>
              <div className="absolute top-3 left-3 text-[9px] font-black theme-text-muted uppercase tracking-wider">2nd Place</div>
              {getRankBadge(2)}
              <div className="space-y-0.5">
                <h3 className="text-sm font-black theme-text-main">{filteredLeaderboard[1].developer.name}</h3>
                <span className="text-[10px] theme-text-muted font-bold flex items-center justify-center space-x-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{filteredLeaderboard[1].developer.region || 'Remote Hub'}</span>
                </span>
              </div>
              <div className="flex gap-4 text-xs font-black neumorphic-concave py-1.5 px-3 rounded-xl">
                <div className="theme-text-main flex items-center space-x-1">
                  <Heart className="w-3.5 h-3.5" /><span>{filteredLeaderboard[1].totalVouches}</span>
                </div>
                <div className="theme-accent flex items-center space-x-1">
                  <Laptop className="w-3.5 h-3.5" /><span>{filteredLeaderboard[1].solutionCount}</span>
                </div>
              </div>
            </div>

            {/* 1st Place Card */}
            <div className={`neumorphic-convex border border-amber-500/30 rounded-4xl p-6 flex flex-col items-center text-center space-y-3.5 relative md:order-2 order-1 transform md:-translate-y-2 ${isMyEntry(filteredLeaderboard[0].developer._id) ? 'ring-1 ring-theme-accent' : ''}`}>
              <div className="absolute top-3 left-3 text-[9px] font-black text-amber-500 flex items-center space-x-1 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>CHAMPION</span>
              </div>
              {getRankBadge(1)}
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-amber-500 tracking-tight">{filteredLeaderboard[0].developer.name}</h3>
                <span className="text-xs theme-text-muted font-black flex items-center justify-center space-x-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{filteredLeaderboard[0].developer.region || 'Remote Hub'}</span>
                </span>
              </div>
              <div className="flex gap-4 text-xs font-black neumorphic-concave py-2 px-4 rounded-[14px]">
                <div className="theme-text-main flex items-center space-x-1">
                  <Heart className="w-3.5 h-3.5" /><span>{filteredLeaderboard[0].totalVouches}</span>
                </div>
                <div className="theme-accent flex items-center space-x-1">
                  <Laptop className="w-3.5 h-3.5" /><span>{filteredLeaderboard[0].solutionCount}</span>
                </div>
              </div>
            </div>

            {/* 3rd Place Card */}
            <div className={`neumorphic-convex rounded-[28px] p-5 flex flex-col items-center text-center space-y-3 relative md:order-3 order-3 ${isMyEntry(filteredLeaderboard[2].developer._id) ? 'ring-1 ring-theme-accent' : ''}`}>
              <div className="absolute top-3 left-3 text-[9px] font-black theme-text-muted uppercase tracking-wider">3rd Place</div>
              {getRankBadge(3)}
              <div className="space-y-0.5">
                <h3 className="text-sm font-black theme-text-main">{filteredLeaderboard[2].developer.name}</h3>
                <span className="text-[10px] theme-text-muted font-bold flex items-center justify-center space-x-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{filteredLeaderboard[2].developer.region || 'Remote Hub'}</span>
                </span>
              </div>
              <div className="flex gap-4 text-xs font-black neumorphic-concave py-1.5 px-3 rounded-xl">
                <div className="theme-text-main flex items-center space-x-1">
                  <Heart className="w-3.5 h-3.5" /><span>{filteredLeaderboard[2].totalVouches}</span>
                </div>
                <div className="theme-accent flex items-center space-x-1">
                  <Laptop className="w-3.5 h-3.5" /><span>{filteredLeaderboard[2].solutionCount}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Leaderboard Table / Card List */}
        {loading ? (
          <div className="neumorphic-convex rounded-[28px] p-16 text-center">
            <div className="w-8 h-8 border-3 border-current theme-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="theme-text-muted font-black text-xs mt-3.5 uppercase tracking-wider">Recalculating developer rankings...</p>
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="neumorphic-convex rounded-[28px] p-16 text-center space-y-3">
            <UserCheck className="w-10 h-10 theme-text-muted mx-auto" />
            <p className="theme-text-main text-sm font-black">No registered developers found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block neumorphic-convex rounded-[28px] overflow-hidden" id="leaderboard-container">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-[10px] font-black uppercase tracking-widest theme-text-muted">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-5">Developer Details</div>
                <div className="col-span-2 text-center">Region</div>
                <div className="col-span-2 text-center">Solutions</div>
                <div className="col-span-2 text-center">Vouches</div>
              </div>

              <div className="divide-y divide-black/5 dark:divide-white/5">
                {filteredLeaderboard.map((entry) => {
                  const rank = entry.rank;
                  const isMe = isMyEntry(entry.developer._id);
                  return (
                    <div key={entry.developer._id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all relative ${isMe ? 'bg-theme-accent/10 border-l-4 border-theme-accent' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                      <div className="col-span-1 flex justify-center">{getRankBadge(rank)}</div>
                      <div className="col-span-5 flex items-center space-x-3 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-black truncate ${isMe ? 'theme-accent' : 'theme-text-main'}`}>{entry.developer.name}</span>
                            {entry.hasDeployedBadge && (
                              <span className="bg-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center space-x-0.5">
                                <Award className="w-2.5 h-2.5" /><span>Deployed</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] theme-text-muted font-mono block truncate">{entry.developer.email}</span>
                        </div>
                      </div>
                      <div className="col-span-2 text-center min-w-0">
                        {entry.developer.region ? (
                          <span className="inline-flex items-center space-x-0.5 text-xs theme-text-muted font-bold truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0" /><span>{entry.developer.region}</span>
                          </span>
                        ) : (
                          <span className="text-xs theme-text-muted font-bold italic">Universal</span>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-xs font-mono font-black theme-accent neumorphic-concave px-3 py-1 rounded-[10px]">
                          {entry.solutionCount}
                        </span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-xs font-mono font-black theme-text-main neumorphic-concave px-3 py-1 rounded-[10px] inline-flex items-center space-x-1">
                          <Heart className="w-3.5 h-3.5" /><span>{entry.totalVouches}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Mobile View omitted for brevity as it follows the exact same pattern */}
          </>
        )}
      </div>
    </div>
  );
};