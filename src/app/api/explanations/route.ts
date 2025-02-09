import { NextResponse } from 'next/server';
import { ExplanationService } from '@/lib/services/explanation-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conceptId = searchParams.get('conceptId');
  const layer = parseInt(searchParams.get('layer') || '1');
  const context = searchParams.get('context') || undefined;
  const forceRegenerate = searchParams.get('forceRegenerate') === 'true';
  const conceptPath = searchParams.get('conceptPath')?.split(',') || undefined;

  if (!conceptId) {
    return NextResponse.json({ error: 'Missing conceptId' }, { status: 400 });
  }

  try {
    const explanation = await ExplanationService.getInstance().generateExplanation({
      conceptId,
      layer,
      context,
      conceptPath,
      forceRegenerate,
    });

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error generating explanation:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  }
} 