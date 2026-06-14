'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';

type Result = { originalUrl: string; enhancedUrl: string };

export default function ClothReshaper() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [style, setStyle] = useState('flat');

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Välj en bildfil (JPG, PNG, WEBP).');
      return;
    }
    setError(null);
    setIsProcessing(true);
    setResult(null);
    try {
      const originalUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('style', style);
      const res = await fetch('/api/reshape', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API-fel');
      setResult({ originalUrl, enhancedUrl: data.reshapedUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel. Försök igen.');
    } finally {
      setIsProcessing(false);
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
    a.download = 'reshaped-cloth.png';
    a.click();
  }

  const styles = [
    { id: 'flat', label: 'Flat lay', desc: 'Snyggt utlagt på en yta' },
    { id: 'hanging', label: 'Hängande', desc: 'På galge, ren bakgrund' },
    { id: 'worn', label: 'Ghost mannequin', desc: 'Buret, utan synlig docka' },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans">

      {/* NAV */}
      <nav className="border-b border-slate-800 px-4 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/" className="text-base font-bold tracking-tight">👕 ClothingEnhancer</Link>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
            100% Gratis
          </span>
        </div>
      </nav>

      {/* HEADER */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 mb-4 inline-block">← Tillbaka till verktyg</Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">👗</span>
            <h1 className="text-3xl font-bold">Cloth Reshaper</h1>
          </div>
          <p className="text-slate-300 text-sm max-w-lg">
            Ladda upp ett klädesplagg – AI formar och vikar det snyggt. Välj stil nedan.
          </p>
        </div>
      </section>

      {/* STYLE PICKER */}
      <section className="border-b border-slate-800 bg-slate-900/30">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Välj stil</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  style === s.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
                }`}
              >
                <p className={`font-semibold text-sm ${
                  style === s.id ? 'text-emerald-400' : 'text-slate-200'
                }`}>{s.label}</p>
                <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* UPLOAD */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Ladda upp plagget</h2>
          <div
            className={`rounded-2xl border ${
              dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/60'
            } p-8 text-center transition-all max-w-md`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
          >
            <label className="block cursor-pointer space-y-3">
              <div className="text-4xl">👗</div>
              <span className="block text-sm font-medium text-slate-200">Dra in en bild här</span>
              <span className="block text-xs text-slate-400">eller klicka för att välja (JPG, PNG, WEBP)</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          {isProcessing && (
            <div className="mt-5 flex items-center gap-2">
              <div className="h-2 w-2 animate-ping rounded-full bg-emerald-400"></div>
              <p className="text-sm text-emerald-400">AI formar plagget… detta kan ta 20–40 sek.</p>
            </div>
          )}
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>
      </section>

      {/* RESULT */}
      {result && (
        <section className="border-b border-slate-800 bg-slate-900/30">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-xl font-bold mb-6">Resultat – Före & efter</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">Före</p>
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                  <img src={result.originalUrl} alt="Original" className="h-72 w-full object-contain" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest">Efter ✨</p>
                <div className="overflow-hidden rounded-xl border border-emerald-600/50 bg-white">
                  <img src={result.enhancedUrl} alt="Omformad" className="h-72 w-full object-contain" />
                </div>
                <button
                  onClick={handleDownload}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all"
                >
                  ⬇️ Ladda ner omformat plagg
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-600 text-center">© 2026 ClothingEnhancer. Alltid gratis.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
