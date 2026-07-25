import React from 'react';
import { Code2, CircuitBoard, Layers } from 'lucide-react';

export type SolutionType = 'software' | 'hardware' | 'hybrid';

/**
 * A civic engineer can solve a problem in software, in hardware, or both. This is
 * a first-class field rather than a tech-stack tag because it changes how Gemini
 * costs the MP's funding blueprint: deploying one app is not the same budget as
 * installing 400 sensors with labour and annual maintenance.
 *
 * Shared by both solution submission paths (the Prototyping Hub card and the
 * Problem Feed modal) and by SolutionCard's badge, so the labels and icons cannot
 * drift apart.
 */
export const DELIVERY_TYPES: { value: SolutionType; label: string; icon: React.ElementType }[] = [
  { value: 'software', label: 'Software', icon: Code2 },
  { value: 'hardware', label: 'Hardware', icon: CircuitBoard },
  { value: 'hybrid', label: 'Hybrid', icon: Layers }
];

interface DeliveryTypeToggleProps {
  value: SolutionType;
  onChange: (value: SolutionType) => void;
  /** Set false on compact forms such as the modal. */
  showHint?: boolean;
}

export const DeliveryTypeToggle: React.FC<DeliveryTypeToggleProps> = ({ value, onChange, showHint = true }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-black uppercase tracking-wider theme-text-muted">Delivery Type</label>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Solution delivery type">
      {DELIVERY_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            aria-pressed={isSelected}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-[14px] text-[10px] font-black uppercase tracking-wider transition-all ${
              isSelected ? 'neumorphic-btn-accent' : 'neumorphic-concave theme-text-muted hover:theme-text-main'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
    {showHint && (
      <p className="text-[10px] theme-text-muted font-bold italic">
        Hardware and hybrid builds are costed per unit, with installation and maintenance, in the MP's funding blueprint.
      </p>
    )}
  </div>
);
