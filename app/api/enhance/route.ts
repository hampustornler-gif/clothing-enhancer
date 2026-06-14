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

    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = image.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Start prediction using the official rembg model
    const startRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({
        version: '3d068e437b5b4982e2b5e3a9f2fe63febd07fc0e4a9c9d59e3c5c8b3e5c2f5e',
        input: {
          image: dataUrl,
        },
      }),
    });

    const prediction = await startRes.json();
    console.log('Replicate response:', JSON.stringify(prediction));

    // If synchronous result already returned
    if (prediction.output) {
      return NextResponse.json({ enhancedUrl: prediction.output });
    }

    // Otherwise poll
    const predictionId = prediction.id;
    if (!predictionId) {
      throw new Error(`No prediction ID: ${JSON.stringify(prediction)}`);
    }

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      const result = await poll.json();
      console.log(`Poll ${i}: status=${result.status}`);
      if (result.status === 'succeeded') {
        return NextResponse.json({ enhancedUrl: result.output });
      } else if (result.status === 'failed' || result.status === 'canceled') {
        throw new Error(`Prediction ${result.status}: ${result.error}`);
      }
    }

    throw new Error('Timeout: prediction did not complete in 60s');
  } catch (err) {
    console.error('Enhance error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Enhancement failed' },
      { status: 500 }
    );
  }
}
