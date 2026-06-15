import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function pickPrompt(style: string) {
  const prompts: Record<string, string> = {
    flat: 'same garment, flat lay, clean white background, subtle natural folds, professional e-commerce product photo, preserve logo, preserve color, preserve material',
    hanging: 'same garment on hanger, clean white background, subtle tailoring, neat drape, preserve logo, preserve color, preserve material, professional product photo',
    worn: 'same garment on ghost mannequin, clean white background, natural drape, preserve logo, preserve color, preserve material, professional e-commerce photo',
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

async function generateMask(imageAb: ArrayBuffer, removeBgKey: string): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append('image_file', new Blob([imageAb], { type: 'image/png' }), 'image.png');
  fd.append('size', 'auto');

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': removeBgKey },
    body: fd,
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('remove.bg error:', errText);
    throw new Error(`remove.bg error: ${res.status} ${errText}`);
  }

  const pngAb = await res.arrayBuffer();

  const sharp = (await import('sharp')).default;
  // Extract alpha → invert: subject=black (preserve), bg=white (inpaint)
  const maskBuffer = await sharp(Buffer.from(pngAb))
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extractChannel('alpha')
    .negate()
    .png()
    .toBuffer();

  return maskBuffer.buffer.slice(maskBuffer.byteOffset, maskBuffer.byteOffset + maskBuffer.byteLength) as ArrayBuffer;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const style = String(formData.get('style') || 'hanging');

    if (!image) return NextResponse.json({ error: 'Ingen bild uppladdad.' }, { status: 400 });

    const stabilityKey = process.env.STABILITY_API_KEY;
    const removeBgKey = process.env.REMOVE_BG_API_KEY;
    if (!stabilityKey) return NextResponse.json({ error: 'STABILITY_API_KEY saknas.' }, { status: 500 });
    if (!removeBgKey) return NextResponse.json({ error: 'REMOVE_BG_API_KEY saknas.' }, { status: 500 });

    const rawAb = await image.arrayBuffer();
    const imageAb = await toResizedAb(rawAb, 1024);
    const maskAb = await generateMask(imageAb, removeBgKey);

    const out = new FormData();
    out.append('image', new Blob([imageAb], { type: 'image/png' }), 'image.png');
    out.append('mask', new Blob([maskAb], { type: 'image/png' }), 'mask.png');
    out.append('prompt', pickPrompt(style));
    out.append('output_format', 'png');
    out.append('negative_prompt', 'different garment, wrong color, watermark, text, blurry, distorted');

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
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
