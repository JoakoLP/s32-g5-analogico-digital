import { Volume2, VolumeX, FileText } from 'lucide-react';

interface MetricsPanelProps {
  bitrate: number;
  levels: number;
  sqnrTheoretical: number;
  sqnrReal: number;
  playingAudio: boolean;
  startDegradationAudio: () => void;
  stopDegradationAudio: () => void;
  handleExportReport: () => void;
}

export function MetricsPanel({
  bitrate,
  levels,
  sqnrTheoretical,
  sqnrReal,
  playingAudio,
  startDegradationAudio,
  stopDegradationAudio,
  handleExportReport
}: MetricsPanelProps) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] text-slate-500 uppercase tracking-wider border-b border-[#25272a] pb-2">
          3. Parámetros de Canal
        </h2>
        <div className="grid grid-cols-2 gap-3 bg-[#0a0b0c] p-4 border border-[#25272a] rounded">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Tasa de Bits</span>
            <span className="text-xs font-mono font-bold text-[#ffa726]">{bitrate.toFixed(1)} kbps</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Niveles (L)</span>
            <span className="text-xs font-mono font-bold text-[#ffa726]">{levels}</span>
          </div>
          <div className="flex flex-col col-span-2 border-t border-[#1d1f22] pt-2 mt-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono">SQNR Teórico</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{sqnrTheoretical.toFixed(2)} dB</span>
          </div>
          <div className="flex flex-col col-span-2 border-t border-[#1d1f22] pt-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 uppercase font-mono">SQNR Real Medido</span>
              <span className="text-[9px] bg-emerald-950 text-[#00e676] px-1 rounded border border-[#00e676]">Calculado</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">{sqnrReal.toFixed(2)} dB</span>
          </div>
        </div>

        {/* Escuchar Audio */}
        <button
          onClick={playingAudio ? stopDegradationAudio : startDegradationAudio}
          className={`w-full font-semibold text-xs py-2.5 px-4 rounded border flex items-center justify-center gap-2 transition-all ${
            playingAudio
              ? 'bg-amber-950 text-[#ffa726] border-[#ffa726]'
              : 'bg-[#1b1c1e] border-[#25272a] text-slate-400 hover:border-[#383a3e]'
          }`}
        >
          {playingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {playingAudio ? "Muestrear Silencio" : "Escuchar Salida (Bitcrusher)"}
        </button>
      </div>

      {/* Exportar Reporte */}
      <div className="mt-auto pt-4 border-t border-[#25272a]">
        <button
          onClick={handleExportReport}
          className="w-full bg-[#1e2226] hover:bg-[#25292e] text-slate-200 border border-[#2d3237] py-2 px-4 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <FileText size={13} /> Exportar Reporte (.TXT)
        </button>
      </div>
    </>
  );
}
