import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'API token missing' }, { status: 500 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to base64 data URL
    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = image.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Step 1: Remove background using Replicate (rembg model)
    const bgResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad458be56bc14e28ba2c819a4c',
        input: { image: dataUrl },
      }),
    });

    if (!bgResponse.ok) {
      throw new Error('Replicate API error');
    }

    const prediction = await bgResponse.json();
    const predictionId = prediction.id;

    // Poll for result (max 30 seconds)
    let enhancedUrl: string | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      const result = await poll.json();
      if (result.status === 'succeeded') {
        enhancedUrl = result.output;
        break;
      } else if (result.status === 'failed') {
        throw new Error('Enhancement failed');
      }
    }

    if (!enhancedUrl) {
      throw new Error('Timeout waiting for result');
    }

    return NextResponse.json({ enhancedUrl });
  } catch (err) {
    console.error('Enhance error:', err);
    return NextResponse.json({ error: 'Enhancement failed' }, { status: 500 });
  }
}
