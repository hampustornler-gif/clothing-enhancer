import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    if (!image) {
      return NextResponse.json({ error: 'Ingen bild uppladdad.' }, { status: 400 });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'REMOVE_BG_API_KEY saknas.' }, { status: 500 });
    }

    // Step 1: Remove background with remove.bg
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

    // Step 2: Compose onto pure white background + enhance with sharp
    const removedBgBuffer = Buffer.from(await res.arrayBuffer());

    const enhanced = await sharp(removedBgBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // pure white bg
      .modulate({ brightness: 1.08, saturation: 1.1 })       // slightly brighter + richer colors
      .sharpen({ sigma: 1.2 })                                // crisp edges
      .resize(1200, 1200, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 95 })
      .toBuffer();

    const base64 = enhanced.toString('base64');
    return NextResponse.json({ reshapedUrl: `data:image/jpeg;base64,${base64}` });

  } catch (err) {
    console.error('Reshape error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Något gick fel.' },
      { status: 500 }
    );
  }
}
