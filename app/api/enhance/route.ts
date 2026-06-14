import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert to base64 for returning as data URL (client-side preview)
    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = image.type || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // TODO: Replace with real AI API call (e.g. Replicate, OpenAI, Fal.ai)
    // For now: returns the original image as "enhanced"
    return NextResponse.json({ enhancedUrl: dataUrl });
  } catch (err) {
    console.error('Enhance error:', err);
    return NextResponse.json({ error: 'Enhancement failed' }, { status: 500 });
  }
}
