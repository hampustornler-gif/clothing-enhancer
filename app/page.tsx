'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';

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
    a.download = 'no-background.png';
    a.click();
  }

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
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4">
            ✨ AI-verktyg för klädsäljare – alltid gratis
          </span>
          <h1 className="text-4xl font-bold tracking-tight leading-tight md:text-5xl">
            Bättre produktbilder<br />
            <span className="text-emerald-400">på en minut.</span>
          </h1>
          <p className="mt-4 text-slate-300 text-sm leading-relaxed max-w-lg">
            Gratis AI-verktyg som hjälper dig sälja mer på Vinted, Tradera och Blocket.
            Inga konton, inga begränsningar.
          </p>
        </div>
      </section>

      {/* TOOLS GRID */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-lg font-bold mb-2">Verktyg</h2>
          <p className="text-sm text-slate-400 mb-8">Välj ett verktyg nedan för att komma igång.</p>

          <div className="grid gap-4 md:grid-cols-3">

            {/* Tool 1: Background Remover – ACTIVE */}
            <div
              className={`rounded-2xl border ${
                dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/60'
              } p-6 shadow-xl transition-all`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🪄</span>
                <div>
                  <h3 className="font-bold text-base">Background Remover</h3>
                  <p className="text-xs text-emerald-400">Gratis • AI-driven</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Ta bort bakgrunden från din klädsbild automatiskt.
              </p>
              <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/40 p-5 text-center">
                <label className="block cursor-pointer space-y-1">
                  <div className="text-3xl">📷</div>
                  <span className="block text-sm font-medium text-slate-200">Dra in en bild här</span>
                  <span className="block text-xs text-slate-400">eller klicka för att välja</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              {isEnhancing && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2 w-2 animate-ping rounded-full bg-emerald-400"></div>
                  <p className="text-xs text-emerald-400">Tar bort bakgrunden… ca 10–20 sek.</p>
                </div>
              )}
              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </div>

            {/* Tool 2: Cloth Reshaper – ACTIVE */}
            <Link
              href="/cloth-reshaper"
              className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl transition-all hover:border-emerald-500/60 hover:bg-emerald-500/5 group block"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">👗</span>
                <div>
                  <h3 className="font-bold text-base">Cloth Reshaper</h3>
                  <p className="text-xs text-emerald-400">Gratis • AI-driven</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                AI formar och vikar dina kläder snyggt – flat lay, hängande eller ghost mannequin.
              </p>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                Prova nu →
              </div>
            </Link>

            {/* Tool 3: AI Beskrivning – COMING SOON */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 opacity-60">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">✍️</span>
                <div>
                  <h3 className="font-bold text-base">AI Beskrivning</h3>
                  <p className="text-xs text-slate-400">Kommer snart</p>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Få en färdig titel, beskrivning och prisförslag anpassad för Vinted, Tradera eller Blocket.
              </p>
              <div className="mt-4 inline-block rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-500">
                🔒 Kommer snart
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* RESULT */}
      {result && (
        <section className="border-b border-slate-800 bg-slate-900/30">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-xl font-bold">Resultat – Före & efter</h2>
            <p className="mt-1 text-sm text-slate-400 mb-6">Se skillnaden och ladda ner din bild.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">Före</p>
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                  <img src={result.originalUrl} alt="Original" className="h-72 w-full object-contain" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest">Efter ✨</p>
                <div className="overflow-hidden rounded-xl border border-emerald-600/50" style={{background: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 0 0 / 20px 20px'}}>
                  <img src={result.enhancedUrl} alt="Utan bakgrund" className="h-72 w-full object-contain" />
                </div>
                <button
                  onClick={handleDownload}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all"
                >
                  ⬇️ Ladda ner PNG (utan bakgrund)
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section id="how" className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-bold">Tre steg. Sextio sekunder.</h2>
          <p className="mt-1 text-sm text-slate-400">Ingen fotostudio eller designkunskaper behövs.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { step: '01', icon: '📤', title: 'Ladda upp', desc: 'Välj en bild från kamerarullen. Vi hanterar resten.' },
              { step: '02', icon: '🤖', title: 'AI förbättrar', desc: 'Bakgrunden tas bort eller plagget formas automatiskt.' },
              { step: '03', icon: '📥', title: 'Ladda ner', desc: 'Få en färdig PNG redo för Vinted, Tradera eller Blocket.' },
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

      {/* FOOTER */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-600 text-center">© 2026 ClothingEnhancer. Alltid gratis.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
