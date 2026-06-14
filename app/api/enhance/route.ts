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

    // Use cjwbw/rembg - most reliable background removal on Replicate
    const startRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad458be56bc14e28ba2c819a4c',
        input: {
          image: dataUrl,
          model: 'u2net_cloth_seg',
        },
      }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      console.error('Replicate start error:', errText);
      throw new Error(`Replicate error: ${startRes.status} ${errText}`);
    }

    const prediction = await startRes.json();
    console.log('Prediction started:', prediction.id, 'status:', prediction.status);

    if (prediction.output) {
      return NextResponse.json({ enhancedUrl: prediction.output });
    }

    const predictionId = prediction.id;
    if (!predictionId) {
      throw new Error(`No prediction ID returned: ${JSON.stringify(prediction)}`);
    }

    // Poll up to 60 seconds
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      const result = await poll.json();
      console.log(`Poll ${i + 1}/60: status=${result.status}`);

      if (result.status === 'succeeded') {
        const output = Array.isArray(result.output) ? result.output[0] : result.output;
        return NextResponse.json({ enhancedUrl: output });
      }
      if (result.status === 'failed' || result.status === 'canceled') {
        throw new Error(`Prediction ${result.status}: ${result.error ?? 'unknown'}`);
      }
    }

    throw new Error('Timeout: prediction did not complete within 60 seconds');
  } catch (err) {
    console.error('Enhance error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Enhancement failed' },
      { status: 500 }
    );
  }
}
