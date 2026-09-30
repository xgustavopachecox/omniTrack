import React from 'react';

export default function NutritionLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto p-4">
      <div className="h-28 rounded-3xl bg-slate-900/80 border border-slate-800" />
      <div className="h-44 rounded-3xl bg-slate-900/70 border border-slate-800" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-900/60 border border-slate-800" />
        ))}
      </div>
    </div>
  );
}
