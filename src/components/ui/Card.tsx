import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={`backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl ${
        padding ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
