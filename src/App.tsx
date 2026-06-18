import { useRef } from 'react';
import { useADCSystem } from './hooks/useADCSystem';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { InputControls } from './components/InputControls';
import { ADCControls } from './components/ADCControls';
import { MetricsPanel } from './components/MetricsPanel';
import { Oscilloscope } from './components/Oscilloscope';

export default function App() {
  const { state, actions, refs } = useADCSystem();
  
  const canvasAnalogRef = useRef<HTMLCanvasElement>(null);
  const canvasDigitalRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="w-full max-w-[1200px] bg-[#161719] border-2 border-[#25272a] rounded shadow-2xl flex flex-col overflow-hidden">
      
      <Header error={state.error} />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-[600px]">
        {/* Panel Lateral de Controles */}
        <aside className="p-6 bg-[#131416] border-r-0 lg:border-r-2 border-[#25272a] flex flex-col gap-6">
          <InputControls
            activeInput={state.activeInput}
            loading={state.loading}
            waveFreq={state.waveFreq}
            stopAllAudioSources={actions.stopAllAudioSources}
            setActiveInput={actions.setActiveInput}
            handleActivateMic={actions.handleActivateMic}
            handleFileUpload={actions.handleFileUpload}
            setWaveFreq={actions.setWaveFreq}
          />
          
          <ADCControls
            samplingRate={state.samplingRate}
            bitDepth={state.bitDepth}
            setSamplingRate={actions.setSamplingRate}
            setBitDepth={actions.setBitDepth}
          />

          <MetricsPanel
            bitrate={state.bitrate}
            levels={state.levels}
            sqnrTheoretical={state.sqnrTheoretical}
            sqnrReal={state.sqnrReal}
            playingAudio={state.playingAudio}
            startDegradationAudio={actions.startDegradationAudio}
            stopDegradationAudio={actions.stopDegradationAudio}
            handleExportReport={actions.handleExportReport}
          />
        </aside>

        {/* Panel Derecho: Osciloscopios */}
        <main className="p-6 flex flex-col gap-6 bg-[#0a0b0d]">
          <Oscilloscope
            title="Señal Analógica Original (Continua)"
            subtitle="Voltaje vs Tiempo"
            color="#00e676"
            canvasRef={canvasAnalogRef}
            signal={refs.originalSignal}
            isDigital={false}
          />

          <Oscilloscope
            title="Señal Digitalizada (Discreta y Cuantizada PCM)"
            subtitle="Pasos de Retención (ZOH)"
            color="#ffa726"
            canvasRef={canvasDigitalRef}
            signal={refs.digitalSignal}
            isDigital={true}
            samplingRate={state.samplingRate}
            aliasingDetected={state.aliasingDetected}
          />

          {/* Panel Teórico de la Cátedra */}
          <div className="mt-auto bg-[#131416] border border-[#25272a] rounded p-4 flex flex-col gap-3">
            <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
              Diagnóstico y Análisis de Nyquist (Comunicaciones FRLP)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              El Teorema de Muestreo de Nyquist-Shannon establece que la frecuencia de muestreo $F_s$ debe ser estrictamente mayor al doble de la componente de frecuencia más alta de la señal original ($F_s &gt; 2 \cdot F_m$) para prevenir la superposición de espectros (aliasing). En este simulador, con una frecuencia de entrada de <strong className="text-[#00e676]">{state.waveFreq} Hz</strong>, requieres un muestreo de al menos <strong className="text-[#ffa726]">{(state.waveFreq * 2 / 1000).toFixed(2)} kHz</strong>.
            </p>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}