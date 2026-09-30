import { NextResponse } from 'next/server';
import { OmniStore } from '@/lib/store';
import { computeMuscleHeatmap } from '@/lib/heatmap';

export async function GET() {
  try {
    const sessions = await OmniStore.getWorkoutSessions();
    const heatmap = computeMuscleHeatmap(sessions, 7);
    return NextResponse.json(heatmap);
  } catch (error) {
    console.error('Error in /api/metrics/muscle-heatmap:', error);
    return NextResponse.json({ error: 'Failed to calculate muscle heatmap' }, { status: 500 });
  }
}
