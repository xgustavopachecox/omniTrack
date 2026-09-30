import React from 'react';

export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto p-4">
      {/* Header Skeleton */}
      <div className="h-28 rounded-3xl bg-slate-900/80 border border-slate-800" />

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-3xl bg-slate-900/60 border border-slate-800" />
        ))}
      </div>

      {/* Body Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-96 rounded-3xl bg-slate-900/70 border border-slate-800" />
        <div className="h-96 rounded-3xl bg-slate-900/70 border border-slate-800" />
      </div>
    </div>
  );
}
