import React from 'react';

export default function WorkoutLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-6xl mx-auto p-4">
      <div className="h-28 rounded-3xl bg-slate-900/80 border border-slate-800" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 rounded-3xl bg-slate-900/70 border border-slate-800" />
        <div className="h-96 rounded-3xl bg-slate-900/70 border border-slate-800" />
      </div>
    </div>
  );
}
