import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      // Fallback: return original image if no API key
      const arrayBuffer = await image.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = image.type || 'image/jpeg';
      return NextResponse.json({ enhancedUrl: `data:${mimeType};base64,${base64}` });
    }

    const outFormData = new FormData();
    outFormData.append('image_file', image);
    outFormData.append('size', 'auto');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: outFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('remove.bg error:', errText);
      throw new Error(`remove.bg error: ${res.status}`);
    }

    const resultBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(resultBuffer).toString('base64');
    return NextResponse.json({ enhancedUrl: `data:image/png;base64,${base64}` });

  } catch (err) {
    console.error('Enhance error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Enhancement failed' },
      { status: 500 }
    );
  }
}
