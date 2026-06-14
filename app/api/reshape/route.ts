import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const token = process.env.STABILITY_API_KEY;
    if (!token) {
      return NextResponse.json({ error: 'STABILITY_API_KEY saknas i miljövariablerna.' }, { status: 500 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const style = (formData.get('style') as string) || 'flat';

    if (!image) {
      return NextResponse.json({ error: 'Ingen bild uppladdad.' }, { status: 400 });
    }

    const stylePrompts: Record<string, string> = {
      flat: 'professional flat lay clothing photography, garment neatly arranged on clean white surface, wrinkle-free, studio lighting, top-down view, product photo',
      hanging: 'clothing hanging on invisible hanger, clean white background, professional product photography, natural folds, studio lighting',
      worn: 'ghost mannequin clothing photography, garment worn by invisible person, natural body shape, clean white background, professional studio lighting, e-commerce product photo',
    };

    const prompt = stylePrompts[style] || stylePrompts['flat'];

    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const outForm = new FormData();
    outForm.append('init_image', new Blob([imageBuffer], { type: image.type }), image.name);
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
