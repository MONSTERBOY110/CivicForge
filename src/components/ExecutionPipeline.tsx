import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { Check, Loader2, ArrowRight, GitBranch, Link2 } from 'lucide-react';

export interface PipelineStage {
  order: number;
  title: string;
  detail: string;
  category: string;
  status: 'pending' | 'active' | 'done';
  coveredGrievanceIds?: string[];
}

interface ExecutionPipelineProps {
  blueprintId: string;
  blueprintStatus: string;
  executionStatus: string;
  stages: PipelineStage[];
  /** Called after a successful advance so the parent can refetch blueprints AND grievances. */
  onChanged: () => void;
}

/**
 * The blueprint's "flow of thought": AI-sequenced work stages rendered as a
 * vertical stepper. Subsurface utility stages come before surface construction,
 * and stages can cover nearby grievances from other departments, so one project
 * fixes the street once instead of each department digging it up in turn.
 *
 * Approval starts execution (stage 1 active); the MP advances stages here, and
 * completing the final stage resolves every covered grievance.
 */
export const ExecutionPipeline: React.FC<ExecutionPipelineProps> = ({
  blueprintId, blueprintStatus, executionStatus, stages, onChanged
}) => {
  const [advancing, setAdvancing] = useState(false);

  if (!stages || stages.length === 0) return null;

  const remaining = stages.filter(s => s.status !== 'done').length;
  const canAdvance = blueprintStatus === 'approved' && executionStatus === 'executing';

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      const res = await axiosClient.patch(`/api/blueprints/${blueprintId}/advance`);
      if (res.data.success) {
        toast.success(res.data.message);
        onChanged();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to advance the pipeline.');
    } finally {
      setAdvancing(false);
    }
  };

  const statusChip =
    executionStatus === 'completed'
      ? { label: 'Project Completed', className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' }
      : executionStatus === 'executing'
        ? { label: `Executing · ${stages.length - remaining}/${stages.length} done`, className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' }
        : { label: 'Starts on authorization', className: 'neumorphic-concave theme-text-muted' };

  return (
    <div className="neumorphic-concave rounded-3xl p-6 space-y-5" id={`pipeline-${blueprintId}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 theme-accent" />
          <h5 className="text-sm font-black theme-text-main uppercase tracking-wider">Execution Pipeline</h5>
          <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusChip.className}`}>
            {statusChip.label}
          </span>
        </div>

        {canAdvance && (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="neumorphic-btn-accent text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center space-x-1.5 disabled:opacity-60"
          >
            {advancing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ArrowRight className="w-3.5 h-3.5" />}
            <span>{remaining === 1 ? 'Complete Final Stage' : 'Advance Stage'}</span>
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="space-y-0">
        {stages.map((stage, idx) => {
          const isDone = stage.status === 'done';
          const isActive = stage.status === 'active';
          const covered = stage.coveredGrievanceIds?.length || 0;

          return (
            <div key={stage.order} className="flex gap-4">
              {/* Circle + connector */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black transition-all ${
                  isDone
                    ? 'neumorphic-btn-accent'
                    : isActive
                      ? 'neumorphic-convex theme-accent ring-2 ring-current animate-pulse'
                      : 'neumorphic-convex theme-text-muted opacity-60'
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : stage.order}
                </div>
                {idx < stages.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-5 ${isDone ? 'bg-current theme-accent opacity-40' : 'bg-black/10 dark:bg-white/10'}`} />
                )}
              </div>

              {/* Stage content */}
              <div className={`pb-5 space-y-1 flex-1 ${!isDone && !isActive ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-black ${isActive ? 'theme-accent' : 'theme-text-main'} ${isDone ? 'line-through opacity-70' : ''}`}>
                    {stage.title}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-wider neumorphic-concave theme-text-muted px-2 py-0.5 rounded-md">
                    {stage.category}
                  </span>
                  {covered > 0 && (
                    <span className="text-[8px] font-black uppercase tracking-wider theme-accent neumorphic-concave px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Link2 className="w-2.5 h-2.5" />
                      covers {covered} linked {covered === 1 ? 'issue' : 'issues'}
                    </span>
                  )}
                </div>
                {stage.detail && (
                  <p className="text-xs theme-text-muted font-medium leading-relaxed">{stage.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
