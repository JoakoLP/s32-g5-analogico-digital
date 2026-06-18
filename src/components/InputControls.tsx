import React from 'react';
import { Activity, Mic, Upload } from 'lucide-react';
import type { InputType } from '../hooks/useADCSystem';

interface InputControlsProps {
  activeInput: InputType;
  loading: boolean;
  waveFreq: number;
  stopAllAudioSources: () => void;
  setActiveInput: (input: InputType) => void;
  handleActivateMic: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setWaveFreq: (freq: number) => void;
}

export function InputControls({
  activeInput,
  loading,
  waveFreq,
  stopAllAudioSources,
  setActiveInput,
  handleActivateMic,
  handleFileUpload,
  setWaveFreq
}: InputControlsProps) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] text-slate-500 uppercase tracking-wider border-b border-[#25272a] pb-2">
          1. Entrada de Señal
        </h2>
        <button
          onClick={() => { stopAllAudioSources(); setActiveInput('synth'); }}
          className={`font-semibold text-xs py-2.5 px-4 rounded border text-left flex items-center gap-2 transition-all ${
            activeInput === 'synth'
              ? 'bg-[rgba(0,230,118,0.06)] border-[#00e676] text-[#00e676]'
              : 'bg-[#1b1c1e] border-[#25272a] text-slate-400 hover:border-[#383a3e]'
          }`}
        >
          <Activity size={14} /> Generador de Prueba
        </button>

        <button
          onClick={handleActivateMic}
          className={`font-semibold text-xs py-2.5 px-4 rounded border text-left flex items-center gap-2 transition-all ${
            activeInput === 'mic'
              ? 'bg-[rgba(0,230,118,0.06)] border-[#00e676] text-[#00e676]'
              : 'bg-[#1b1c1e] border-[#25272a] text-slate-400 hover:border-[#383a3e]'
          }`}
        >
          <Mic size={14} /> Grabar Micrófono
        </button>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className={`font-semibold text-xs py-2.5 px-4 rounded border text-left flex items-center gap-2 transition-all ${
            activeInput === 'file'
              ? 'bg-[rgba(0,230,118,0.06)] border-[#00e676] text-[#00e676]'
              : 'bg-[#1b1c1e] border-[#25272a] text-slate-400 hover:border-[#383a3e]'
          }`}>
            <Upload size={14} /> {loading ? "Decodificando..." : "Subir MP3/WAV"}
          </div>
        </label>
      </div>

      {activeInput === 'synth' && (
        <div className="flex flex-col gap-3">
          <h2 className="font-mono text-[11px] text-slate-500 uppercase tracking-wider border-b border-[#25272a] pb-2">
            Frecuencia de Onda
          </h2>
          <div className="flex justify-between text-xs text-slate-300 font-mono">
            <span>Frecuencia (Fm):</span>
            <span className="text-[#00e676] font-bold">{waveFreq} Hz</span>
          </div>
          <input
            type="range"
            min={100}
            max={2500}
            step={10}
            value={waveFreq}
            onChange={(e) => setWaveFreq(parseInt(e.target.value))}
            className="analog-slider"
          />
        </div>
      )}
    </>
  );
}
