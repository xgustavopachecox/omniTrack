import React from 'react';

export default function FinanceiroLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 flex flex-col justify-between"
          >
            <div className="h-4 w-28 bg-slate-800 rounded" />
            <div className="h-8 w-36 bg-slate-800 rounded" />
            <div className="h-3 w-24 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 rounded-2xl bg-slate-900/70 border border-slate-800/80" />
        <div className="h-80 rounded-2xl bg-slate-900/70 border border-slate-800/80" />
      </div>
    </div>
  );
}
