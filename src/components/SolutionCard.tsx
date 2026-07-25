import React, { useState } from 'react';
import { VouchButton } from './VouchButton';
import { ExternalLink, Code } from 'lucide-react';

interface SolutionCardProps {
  solution: any;
  userRole?: string;
  onVouched?: (id: string, newCount: number) => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const SolutionCard: React.FC<SolutionCardProps> = ({ solution, userRole, onVouched, onSelect, isSelected }) => {
  const [vouchCount, setVouchCount] = useState(solution.vouchCount);

  const handleVouchedLocal = (newCount: number) => {
    setVouchCount(newCount);
    if (onVouched) onVouched(solution._id, newCount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20';
      case 'matched': return 'bg-blue-500/20 text-blue-500 border border-blue-500/20';
      case 'under_review': return 'bg-amber-500/20 text-amber-500 border border-amber-500/20';
      default: return 'neumorphic-concave theme-text-muted';
    }
  };

  return (
    <div 
      onClick={onSelect}
      className={`neumorphic-convex rounded-3xl p-6 space-y-4 transition-all duration-300 hover:brightness-110 cursor-pointer ${
        isSelected ? 'ring-2 ring-theme-accent scale-[1.02]' : ''
      }`}
    >
      <div className="flex justify-between items-start space-x-2">
        <div className="space-y-1 flex-1">
          <span className="text-[9px] font-black uppercase tracking-wider neumorphic-concave theme-text-muted px-2.5 py-1 rounded-md">
            {solution.targetCategory}
          </span>
          <h4 className="text-base font-black theme-text-main line-clamp-1 mt-2">{solution.title}</h4>
          <p className="text-[10px] font-bold theme-text-muted">
            By <span className="theme-accent font-black">{solution.developer?.name || 'Anonymous'}</span>
          </p>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusColor(solution.status)}`}>
          {solution.status.replace('_', ' ')}
        </span>
      </div>

      <p className="theme-text-muted text-xs font-medium line-clamp-3 leading-relaxed">{solution.description}</p>

      {solution.techStack && solution.techStack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {solution.techStack.map((tech: string) => (
            <span key={tech} className="neumorphic-concave theme-text-main text-[9px] font-extrabold px-2 py-0.5 rounded-md">
              {tech}
            </span>
          ))}
        </div>
      )}

      <div className="h-px bg-black/10 dark:bg-white/10 my-3"></div>

      <div className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-3 text-xs font-bold theme-text-muted">
          {solution.repoUrl && (
            <a href={solution.repoUrl} target="_blank" rel="noopener noreferrer" className="hover:theme-accent flex items-center space-x-1 transition-colors">
              <Code className="w-3.5 h-3.5" /><span>Repo</span>
            </a>
          )}
          {solution.demoUrl && (
            <a href={solution.demoUrl} target="_blank" rel="noopener noreferrer" className="hover:theme-accent flex items-center space-x-1 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /><span>Demo</span>
            </a>
          )}
        </div>
        <VouchButton solutionId={solution._id} initialVouchCount={vouchCount} onVouched={handleVouchedLocal} userRole={userRole} />
      </div>
    </div>
  );
};