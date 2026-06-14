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

    // Resize to 1024x1024 (required by SDXL)
    const resizedBuffer = await sharp(inputBuffer)
      .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    const stylePrompts: Record<string, string> = {
      flat: 'professional flat lay clothing photography, garment neatly arranged on clean white surface, wrinkle-free, studio lighting, top-down view, product photo',
      hanging: 'clothing hanging on invisible hanger, clean white background, professional product photography, natural folds, studio lighting',
      worn: 'ghost mannequin clothing photography, garment worn by invisible person, natural body shape, clean white background, professional studio lighting, e-commerce product photo',
    };

    const prompt = stylePrompts[style] || stylePrompts['flat'];

    const outForm = new FormData();
    // TS tycker illa om Buffer här, men i runtime är det ok – kasta till any
    outForm.append('init_image', new Blob([resizedBuffer as any], { type: 'image/png' }), 'image.png');
    outForm.append('init_image_mode', 'IMAGE_STRENGTH');
    outForm.append('image_strength', '0.35');
    outForm.append('text_prompts[0][text]', prompt);
    outForm.append('text_prompts[0][weight]', '1');
    outForm.append('text_prompts[1][text]', 'blurry, bad quality, distorted, watermark, person, face, hands');
    outForm.append('text_prompts[1][weight]', '-1');
    outForm.append('cfg_scale', '7');
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
