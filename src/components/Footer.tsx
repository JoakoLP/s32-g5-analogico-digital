

export function Footer() {
  return (
    <footer className="px-6 py-3 bg-[#0a0b0d] border-t-2 border-[#25272a] flex justify-between items-center text-[11px] text-slate-500">
      <div>
        Muestreo: <span className="font-mono text-slate-300 bg-[#161719] px-2 py-1 rounded border border-[#202225]">Fs &gt; 2 • Fm</span>
      </div>
      <div>
        Cuantización: <span className="font-mono text-slate-300 bg-[#161719] px-2 py-1 rounded border border-[#202225]">L = 2ᵇ</span>
      </div>
      <div>
        Relación Señal/Ruido: <span className="font-mono text-slate-300 bg-[#161719] px-2 py-1 rounded border border-[#202225]">SQNR ≈ 6.02 • b + 1.76 dB</span>
      </div>
    </footer>
  );
}
