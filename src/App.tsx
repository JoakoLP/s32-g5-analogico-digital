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
    <div className="w-full h-full bg-[#161719] flex flex-col overflow-hidden">
      
      <Header error={state.error} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr] overflow-hidden">
        {/* Panel Lateral de Controles */}
        <aside className="p-6 bg-[#131416] border-r-0 lg:border-r-2 border-[#25272a] flex flex-col gap-6 overflow-y-auto">
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
        <main className="p-6 flex flex-col gap-6 bg-[#0a0b0d] overflow-y-auto">
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
          <div className="mt-auto bg-[#131416] border border-[#25272a] rounded p-5 flex flex-col gap-4">
            <h3 className="font-mono text-[11px] text-slate-400 uppercase tracking-widest border-b border-[#25272a] pb-2">
              Soporte Teórico y Fórmulas del Sistema
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 leading-relaxed">
              <div>
                <strong className="text-slate-300">1. Teorema de Nyquist-Shannon:</strong><br/>
                La frecuencia de muestreo debe ser estrictamente mayor al doble de la frecuencia fundamental de la señal original para evitar el <i>aliasing</i>.<br/>
                <code className="bg-[#0a0b0d] px-1.5 py-0.5 rounded border border-[#1e2226] mt-1.5 block w-fit">F_s &gt; 2 · F_m</code>
              </div>
              
              <div>
                <strong className="text-slate-300">2. Niveles de Cuantización (L):</strong><br/>
                Es la cantidad de escalones de voltaje discretos que el ADC puede representar, definidos por la profundidad de bits.<br/>
                <code className="bg-[#0a0b0d] px-1.5 py-0.5 rounded border border-[#1e2226] mt-1.5 block w-fit">L = 2^b</code>
              </div>

              <div>
                <strong className="text-slate-300">3. Tasa de Bits del Canal (R):</strong><br/>
                Es la velocidad de transmisión de datos necesaria para enviar la señal PCM sin compresión.<br/>
                <code className="bg-[#0a0b0d] px-1.5 py-0.5 rounded border border-[#1e2226] mt-1.5 block w-fit">R = F_s · b</code>
              </div>

              <div>
                <strong className="text-slate-300">4. Relación Señal/Ruido de Cuantización (SQNR):</strong><br/>
                Mide la calidad de la señal frente al ruido introducido por el ADC. Cada bit extra suma ~6 dB al margen dinámico.<br/>
                <code className="bg-[#0a0b0d] px-1.5 py-0.5 rounded border border-[#1e2226] mt-1.5 block w-fit">SQNR ≈ 6.02 · b + 1.76 dB</code>
              </div>
            </div>

            <div className="bg-[rgba(255,167,38,0.05)] border border-[#ffa726]/20 p-3 rounded mt-2">
              <strong className="text-[#ffa726] font-mono text-[10px] uppercase">Diagnóstico en Tiempo Real:</strong><br/>
              <span className="text-xs text-slate-300">
                Con una frecuencia base actual de <strong className="text-[#00e676]">{state.waveFreq} Hz</strong>, se requiere un muestreo mínimo estricto de <strong className="text-[#ffa726]">{(state.waveFreq * 2 / 1000).toFixed(2)} kHz</strong>. Tienes configurada una F_s de {state.samplingRate.toFixed(1)} kHz, resultando en una Tasa de Datos de canal de {state.bitrate.toFixed(1)} kbps.
              </span>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}