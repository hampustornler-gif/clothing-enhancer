import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function pickPrompt(style: string) {
  const prompts: Record<string, string> = {
    flat: 'professional e-commerce product photo, same garment flat lay, pure white background, centered, soft studio lighting, preserve all logos text and colors exactly, no shadows, sharp focus',
    hanging: 'professional e-commerce product photo, same garment on hanger, pure white background, centered, soft studio lighting, preserve all logos text and colors exactly, no shadows, sharp focus',
    worn: 'professional e-commerce product photo, same garment on ghost mannequin, pure white background, centered, soft studio lighting, preserve all logos text and colors exactly, no shadows, sharp focus',
  };
  return prompts[style] ?? prompts.hanging;
}

async function toResizedAb(input: ArrayBuffer, size = 1024): Promise<ArrayBuffer> {
  const sharp = (await import('sharp')).default;
  const buf = await sharp(Buffer.from(input))
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const style = String(formData.get('style') || 'hanging');

    if (!image) return NextResponse.json({ error: 'Ingen bild uppladdad.' }, { status: 400 });

    const stabilityKey = process.env.STABILITY_API_KEY;
    if (!stabilityKey) return NextResponse.json({ error: 'STABILITY_API_KEY saknas.' }, { status: 500 });

    const rawAb = await image.arrayBuffer();
    const imageAb = await toResizedAb(rawAb, 1024);

    const out = new FormData();
    out.append('image', new Blob([imageAb], { type: 'image/png' }), 'image.png');
    out.append('prompt', pickPrompt(style));
    out.append('output_format', 'png');
    out.append('negative_prompt', 'different garment, changed colors, changed logos, changed text, watermark, blurry, distorted, mannequin visible, person visible, background objects');
    out.append('image_strength', '0.35');
    out.append('mode', 'image-to-image');

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stabilityKey}`,
        Accept: 'application/json',
      },
      body: out,
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Stability error:', txt);
      return NextResponse.json({ error: `Stability API fel: ${txt}` }, { status: res.status });
    }

    const data = await res.json();
    const imageData: string | undefined = data.image ?? data.artifacts?.[0]?.base64;
    if (!imageData) {
      console.error('Stability svar saknar bild:', JSON.stringify(data));
      return NextResponse.json({ error: 'Inget bildresultat fr\u00e5n API.' }, { status: 502 });
    }

    const reshapedUrl = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
    return NextResponse.json({ reshapedUrl });

  } catch (err) {
    console.error('Reshape error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'N\u00e5got gick fel.' },
      { status: 500 }
    );
  }
}
