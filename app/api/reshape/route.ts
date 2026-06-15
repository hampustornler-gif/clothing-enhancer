import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function pickPrompt(style: string) {
  const prompts: Record<string, string> = {
    flat: 'same garment, flat lay, clean white background, subtle folds, professional e-commerce product photo, preserve logo, preserve color, preserve material, improve shape naturally',
    hanging: 'same garment on hanger, clean white background, subtle tailoring, neat drape, preserve logo, preserve color, preserve material, professional e-commerce product photo',
    worn: 'same garment on ghost mannequin, clean white background, natural drape, subtle tailoring, preserve logo, preserve color, preserve material, professional e-commerce product photo',
  };
  return prompts[style] ?? prompts.hanging;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const mask = formData.get('mask') as File | null;
    const style = String(formData.get('style') || 'hanging');

    if (!image) return NextResponse.json({ error: 'Ingen bild uppladdad.' }, { status: 400 });
    if (!mask) return NextResponse.json({ error: 'Ingen mask uppladdad.' }, { status: 400 });

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'STABILITY_API_KEY saknas.' }, { status: 500 });

    const out = new FormData();
    out.append('image', image);
    out.append('mask', mask);
    out.append('prompt', pickPrompt(style));
    out.append('output_format', 'png');
    out.append('negative_prompt', 'different garment, wrong style, wrong color, watermark, text, blurry, distorted');
    out.append('seed', '0');
    out.append('cfg_scale', '5');
    out.append('steps', '35');

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: out,
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const data = await res.json();
    const imageData = data.image || data.artifacts?.[0]?.base64;
    if (!imageData) return NextResponse.json({ error: 'Inget bildresultat från API.' }, { status: 502 });

    const reshapedUrl = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
    return NextResponse.json({ reshapedUrl });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Något gick fel.' },
      { status: 500 }
    );
  }
}
