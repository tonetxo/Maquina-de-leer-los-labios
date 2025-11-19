import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  text: string;
}

export const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in duration-500">
      <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      <p className="text-brand-100 font-medium text-lg tracking-wide animate-pulse-slow">{text}</p>
    </div>
  );
};