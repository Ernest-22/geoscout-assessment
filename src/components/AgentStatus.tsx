import React from 'react';
import clsx from 'clsx'; // Make sure to install: npm install clsx

interface Props {
  message: string;
  confidence: number;
}

export function AgentStatus({ message, confidence, loading}: Props) {
  // FIX 4: Explicit Failure/Uncertainty State
  const isUncertain = confidence > 0 && confidence < 0.4;

  const getColor = (c: number) => {
    if (c < 0.3) return 'bg-red-500';
    if (c < 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={clsx(
      "w-full max-w-md bg-slate-900 p-4 rounded-lg border shadow-xl mb-6 transition-colors duration-500",
      isUncertain ? "border-red-500/50" : "border-slate-700",
      loading && "animate-pulse" // <--- Adds a subtle "breathing" effect when thinking
    )}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          {isUncertain ? "⚠️ SIGNAL UNSTABLE" : "GeoScout Agent"}
        </span>
        <span className="text-xs font-mono text-slate-400">CONF: {Math.round(confidence * 100)}%</span>
      </div>
      
     <div className="bg-black/50 p-4 rounded border-l-4 border-emerald-500 mb-3 shadow-inner">
  <p className="font-mono text-emerald-300 text-lg leading-relaxed font-medium"> 
    {message || "Initializing..."}
  </p>
</div>

      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${getColor(confidence)}`} 
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
    </div>
  );
}