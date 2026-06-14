'use client';

import React, { useState, useCallback } from 'react';

type Result = { originalUrl: string; enhancedUrl: string };

export default function HomePage() {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Välj en bildfil (JPG, PNG, WEBP).');
      return;
    }
    setError(null);
    setIsEnhancing(true);
    setResult(null);
    try {
      const originalUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/enhance', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('API-fel');
      const data = await res.json();
      setResult({ originalUrl, enhancedUrl: data.enhancedUrl || originalUrl });
    } catch {
      setError('Något gick fel. Försök igen.');
    } finally {
      setIsEnhancing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  function handleDownload() {
    if (!result?.enhancedUrl) return;
    const a = document.createElement('a');
    a.href = result.enhancedUrl;
    a.download = 'enhanced.png';
    a.click();
  }

  const UploadInput = ({ label }: { label: string }) => (
    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
      {label}
      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans">

      {/* NAV */}
      <nav className="border-b border-slate-800 px-4 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <span className="text-base font-bold tracking-tight">👕 ClothingEnhancer</span>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
            100% Gratis
          </span>
        </div>
      </nav>

      {/* HERO */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
          <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4">
                ✨ AI-driven bildförbättring – alltid gratis
              </span>
              <h1 className="text-4xl font-bold tracking-tight leading-tight md:text-5xl">
                Bättre produktbilder<br />
                <span className="text-emerald-400">på en minut.</span>
              </h1>
              <p className="mt-4 text-slate-300 text-sm leading-relaxed">
                Ladda upp en snabb mobilbild – få tillbaka en ren, ljus och
                butiksklar bild som passar Vinted, Tradera, Blocket eller din egna shop.
                Helt gratis, inga konton, inga begränsningar.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 items-center">
                <UploadInput label="Ladda upp & förbättra" />
                <a href="#how" className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-4">Se hur det funkar →</a>
              </div>
              <p className="mt-3 text-xs text-slate-500">Inga kortuppgifter. Inga konton. Helt gratis alltid.</p>
            </div>

            {/* Upload card */}
            <div
              className={`w-full max-w-sm rounded-2xl border ${
                dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/60'
              } p-5 shadow-2xl transition-all`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Ladda upp</p>
              <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/40 p-6 text-center">
                <label className="block cursor-pointer space-y-2">
                  <div className="text-3xl">📷</div>
                  <span className="block text-sm font-medium text-slate-200">Dra in en bild här</span>
                  <span className="block text-xs text-slate-400">eller klicka för att välja</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              {isEnhancing && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2 w-2 animate-ping rounded-full bg-emerald-400"></div>
                  <p className="text-xs text-emerald-400">Förbättrar bilden… ca 10–20 sek.</p>
                </div>
              )}
              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section id="result" className="border-b border-slate-800 bg-slate-900/30">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-bold">Före & efter</h2>
          <p className="mt-1 text-sm text-slate-400">Se skillnaden innan du laddar ner.</p>
          {result ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">Före</p>
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                  <img src={result.originalUrl} alt="Original" className="h-72 w-full object-contain" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest">Efter ✨</p>
                <div className="overflow-hidden rounded-xl border border-emerald-600/50 bg-slate-900">
                  <img src={result.enhancedUrl} alt="Förbättrad" className="h-72 w-full object-contain" />
                </div>
                <button
                  onClick={handleDownload}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all"
                >
                  ⬇️ Ladda ner förbättrad bild
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
              Ladda upp en bild ovan för att se resultat här.
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-bold">Tre steg. Sextio sekunder.</h2>
          <p className="mt-1 text-sm text-slate-400">Ingen fotostudio eller designkunskaper behövs.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { step: '01', icon: '📤', title: 'Ladda upp', desc: 'Välj en bild från kamerarullen. Vi hanterar resten.' },
              { step: '02', icon: '🤖', title: 'AI förbättrar', desc: 'Bakgrund, ljus och skärpa justeras automatiskt.' },
              { step: '03', icon: '📥', title: 'Ladda ner', desc: 'Få en högupplöst bild redo för Vinted, Tradera eller Blocket.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <span className="text-xs font-bold text-emerald-400">Steg {step}</span>
                <div className="mt-2 text-2xl">{icon}</div>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex flex-col justify-between gap-4 border-t border-slate-800 pt-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-bold">Gör varje annons lite mer premium.</h2>
              <p className="mt-1 text-sm text-slate-400">Helt gratis – sälj mer med samma garderob.</p>
            </div>
            <UploadInput label="Förbättra en bild nu" />
          </div>
          <p className="mt-6 text-xs text-slate-600 text-center">© 2026 ClothingEnhancer. Alltid gratis.</p>
        </div>
      </section>
    </main>
  );
}
