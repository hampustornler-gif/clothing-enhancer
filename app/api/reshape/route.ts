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

async function toUint8(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

async function generateMask(imageBytes: Uint8Array, removeBgKey: string): Promise<Uint8Array> {
  const fd = new FormData();
  fd.append('image_file', new Blob([imageBytes], { type: 'image/png' }), 'image.png');
  fd.append('size', 'auto');

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': removeBgKey },
    body: fd,
  });
  if (!res.ok) throw new Error(`remove.bg error: ${res.status}`);

  const pngBytes = new Uint8Array(await res.arrayBuffer());

  // Use sharp to extract alpha channel and invert it:
  // subject = black (keep), background = white (edit area for inpainting)
  const sharp = (await import('sharp')).default;
  const maskBuffer = await sharp(Buffer.from(pngBytes))
    .extractChannel('alpha')
    .negate()
    .png()
    .toBuffer();

  return new Uint8Array(maskBuffer);
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

    const imageBytes = await toUint8(image);
    const maskBytes = await generateMask(imageBytes, removeBgKey);

    const out = new FormData();
    out.append('image', new Blob([imageBytes], { type: 'image/png' }), 'image.png');
    out.append('mask', new Blob([maskBytes], { type: 'image/png' }), 'mask.png');
    out.append('prompt', pickPrompt(style));
    out.append('output_format', 'png');
    out.append('negative_prompt', 'different garment, wrong color, watermark, text, blurry, distorted');
    out.append('seed', '0');
    out.append('cfg_scale', '5');
    out.append('steps', '35');

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
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const data = await res.json();
    const imageData: string | undefined = data.image ?? data.artifacts?.[0]?.base64;
    if (!imageData) return NextResponse.json({ error: 'Inget bildresultat fr\u00e5n API.' }, { status: 502 });

    const reshapedUrl = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
    return NextResponse.json({ reshapedUrl });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'N\u00e5got gick fel.' },
      { status: 500 }
    );
  }
}
