import { NextResponse } from 'next/server';
import { analyzeContent } from '@/lib/analysis';
import { type AnalysisRequest } from '@/types/analysis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analysisRequest: AnalysisRequest = {
      content: body.content,
      format: body.format || 'markdown',
      language: body.language || 'en'
    };

    const result = await analyzeContent(analysisRequest, body.onProgress);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Analysis failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze content' 
      },
      { status: 500 }
    );
  }
} 