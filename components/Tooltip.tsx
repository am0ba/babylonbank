import { HelpCircle } from 'lucide-react';

export default function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-block ml-1.5 align-text-bottom cursor-help z-20">
      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
      <span className="absolute bottom-full mb-2 scale-95 origin-bottom left-1/2 -translate-x-1/2 w-48 sm:w-56 p-2.5 bg-card text-card-foreground shadow-sm text-xs text-muted-foreground rounded-xl opacity-0 invisible group-hover:scale-100 group-hover:opacity-100 group-hover:visible transition-all shadow-xl border border-border pointer-events-none z-50 leading-relaxed block whitespace-normal font-normal normal-case tracking-normal text-center">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white drop-shadow-sm -mt-[1px]"></span>
      </span>
    </span>
  );
}
