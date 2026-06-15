/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const token = process.env.STABILITY_API_KEY;
    if (!token) {
      return NextResponse.json({ error: 'STABILITY_API_KEY saknas.' }, { status: 500 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const style = (formData.get('style') as string) || 'flat';

    if (!image) {
      return NextResponse.json({ error: 'Ingen bild uppladdad.' }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const resizedBuffer = await sharp(inputBuffer)
      .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    const stylePrompts: Record<string, string> = {
      flat: 'exact same garment, flat lay on clean white surface, same color same design same fabric, professional product photo, studio lighting, top-down view',
      hanging: 'exact same garment hanging on invisible hanger, same color same design same fabric, clean white background, professional product photography, studio lighting',
      worn: 'exact same garment on ghost mannequin, same color same design same fabric, clean white background, professional studio lighting, e-commerce product photo',
    };

    const prompt = stylePrompts[style] || stylePrompts['flat'];

    const cleanBuffer: ArrayBuffer = resizedBuffer.buffer.slice(
      resizedBuffer.byteOffset,
      resizedBuffer.byteOffset + resizedBuffer.byteLength
    ) as ArrayBuffer;

    const outForm = new FormData();
    outForm.append('init_image', new Blob([cleanBuffer], { type: 'image/png' }), 'image.png');
    outForm.append('init_image_mode', 'IMAGE_STRENGTH');
    outForm.append('image_strength', '0.85');
    outForm.append('text_prompts[0][text]', prompt);
    outForm.append('text_prompts[0][weight]', '1');
    outForm.append('text_prompts[1][text]', 'different garment, wrong color, wrong style, blurry, watermark, person, face, hands');
    outForm.append('text_prompts[1][weight]', '-1');
    outForm.append('cfg_scale', '5');
    outForm.append('samples', '1');
    outForm.append('steps', '30');

    const res = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: outForm,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Stability error:', errText);
      throw new Error(`Stability AI fel: ${res.status}`);
    }

    const data = await res.json();
    const base64 = data.artifacts?.[0]?.base64;
    if (!base64) throw new Error('Inget resultat från AI.');

    return NextResponse.json({ reshapedUrl: `data:image/png;base64,${base64}` });
  } catch (err) {
    console.error('Reshape error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Något gick fel.' },
      { status: 500 }
    );
  }
}
