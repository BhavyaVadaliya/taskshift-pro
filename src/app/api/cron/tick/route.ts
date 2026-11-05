import { NextRequest, NextResponse } from 'next/server';
import { runSchedulerTick } from '@/lib/scheduler';

export async function POST(req: NextRequest) {
  try {
    const result = await runSchedulerTick();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Scheduler tick error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const result = await runSchedulerTick();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Scheduler tick error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

