import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { ThumbsUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface VouchButtonProps {
  solutionId: string;
  initialVouchCount: number;
  onVouched: (updatedCount: number) => void;
  userRole?: string;
}

export const VouchButton: React.FC<VouchButtonProps> = ({ solutionId, initialVouchCount, onVouched, userRole }) => {
  const [loading, setLoading] = useState(false);
  const [vouched, setVouched] = useState(false);
  const [vouchCount, setVouchCount] = useState(initialVouchCount);

  const handleVouch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userRole === 'mp') { toast.error('Evaluators/MPs cannot register vouches.'); return; }
    setLoading(true);
    try {
      const response = await axiosClient.post(`/api/solutions/${solutionId}/vouch`, { comment: 'Verified prototype and vouched!' });
      if (response.data.success) {
        const newCount = response.data.solution.vouchCount;
        setVouchCount(newCount); setVouched(true); onVouched(newCount);
        toast.success('Vouch registered successfully!');
      }
    } catch (err: any) { toast.error('Failed to register vouch.'); } finally { setLoading(false); }
  };

  return (
    <button
      onClick={handleVouch}
      disabled={loading || vouched}
      className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
        vouched ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' : 'neumorphic-convex theme-text-muted hover:theme-accent active:scale-95 cursor-pointer'
      } disabled:opacity-80`}
    >
      {loading ? (<Loader2 className="w-3.5 h-3.5 animate-spin theme-accent" />) : (<ThumbsUp className={`w-3.5 h-3.5 ${vouched ? 'fill-emerald-500 text-emerald-500' : ''}`} />)}
      <span>{vouchCount} {vouchCount === 1 ? 'Vouch' : 'Vouches'}</span>
    </button>
  );
};