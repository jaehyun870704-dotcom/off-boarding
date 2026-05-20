interface BadgeProps {
  label: string;
  variant?: 'teal' | 'coral' | 'amber' | 'gray' | 'blue';
  size?: 'sm' | 'md';
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps['variant']>, string> = {
  teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  coral: 'bg-coral/20 text-coral border-coral/30',
  amber: 'bg-amber/20 text-amber border-amber/30',
  gray: 'bg-white/10 text-slate-400 border-white/10',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export function Badge({ label, variant = 'gray', size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${VARIANT_CLASSES[variant]}`}
    >
      {label}
    </span>
  );
}
