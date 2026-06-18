

interface ADCControlsProps {
  samplingRate: number;
  bitDepth: number;
  setSamplingRate: (val: number) => void;
  setBitDepth: (val: number) => void;
}

export function ADCControls({
  samplingRate,
  bitDepth,
  setSamplingRate,
  setBitDepth
}: ADCControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-mono text-[11px] text-slate-500 uppercase tracking-wider border-b border-[#25272a] pb-2">
        2. Digitalización (ADC)
      </h2>

      {/* Tasa de Muestreo */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-300">Tasa de Muestreo (Fs):</span>
          <span className="text-[#ffa726] font-bold">{samplingRate.toFixed(1)} kHz</span>
        </div>
        <input
          type="range"
          min={1.0}
          max={44.1}
          step={0.5}
          value={samplingRate}
          onChange={(e) => setSamplingRate(parseFloat(e.target.value))}
          className="w-full accent-[#ffa726]"
        />
      </div>

      {/* Profundidad de Bits */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-300">Resolución (Bits):</span>
          <span className="text-[#ffa726] font-bold">{bitDepth} bits</span>
        </div>
        <input
          type="range"
          min={2}
          max={16}
          step={1}
          value={bitDepth}
          onChange={(e) => setBitDepth(parseInt(e.target.value))}
          className="w-full accent-[#ffa726]"
        />
      </div>
    </div>
  );
}
