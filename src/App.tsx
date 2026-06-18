import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Mic, Upload, Volume2, VolumeX, FileText,
  Settings, Play, Square, RefreshCw, Server, AlertTriangle
} from 'lucide-react';

// Interfaces de tipos para TypeScript
interface ProcessResult {
  processed_signal: number[];
  bitrate: number;
  levels: number;
  sqnr_theoretical: number;
  sqnr_real: number;
}

export default function App() {
  // --- ESTADO DE PARÁMETROS DEL ADC ---
  const [activeInput, setActiveInput] = useState<'synth' | 'mic' | 'file'>('synth');
  const [waveFreq, setWaveFreq] = useState<number>(440); // Frecuencia de la señal original en Hz
  const [samplingRate, setSamplingRate] = useState<number>(8.0); // Fs en kHz
  const [bitDepth, setBitDepth] = useState<number>(8); // b bits
  const [playingAudio, setPlayingAudio] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- MÉTRICAS DE CANAL ---
  const [bitrate, setBitrate] = useState<number>(64.0);
  const [levels, setLevels] = useState<number>(256);
  const [sqnrTheoretical, setSqnrTheoretical] = useState<number>(49.92);
  const [sqnrReal, setSqnrReal] = useState<number>(48.5);
  const [aliasingDetected, setAliasingDetected] = useState<boolean>(false);

  // --- REFS PARA CAPTURA Y CANVAS ---
  const canvasAnalogRef = useRef<HTMLCanvasElement | null>(null);
  const canvasDigitalRef = useRef<HTMLCanvasElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const uploadedBufferRef = useRef<AudioBuffer | null>(null);

  // Buffer local de muestras original para dibujar y procesar (512 puntos)
  const originalSignal = useRef<Float32Array>(new Float32Array(512));
  const digitalSignal = useRef<Float32Array>(new Float32Array(512));

  // Variables auxiliares de animación y throttling
  const phaseRef = useRef<number>(0);
  const lastApiCallRef = useRef<number>(0);
  const apiCallPendingRef = useRef<boolean>(false);

  // --- REPRODUCTOR INTEGRADO DE DEGRADACIÓN (BITCRUSHER) ---
  const synthOscRef = useRef<OscillatorNode | null>(null);
  const synthCrusherRef = useRef<ScriptProcessorNode | null>(null);

  // --- INICIALIZACIÓN ---
  useEffect(() => {
    // Generar datos iniciales en el buffer
    if (activeInput === 'synth') {
      generateSynthSamples();
    }

    // Iniciar bucle de animación 60fps
    let animationId: number;
    const renderLoop = () => {
      if (activeInput === 'synth') {
        generateSynthSamples();
      }
      drawAnalogCanvas();
      drawDigitalCanvas();

      // Control de flujo para llamar al backend sin saturar (máx 1 vez cada 150ms)
      const now = Date.now();
      if (now - lastApiCallRef.current > 150 && !apiCallPendingRef.current) {
        syncWithBackend();
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    // Ajustar el tamaño de los canvas al iniciar
    const handleResize = () => {
      if (canvasAnalogRef.current && canvasDigitalRef.current) {
        canvasAnalogRef.current.width = canvasAnalogRef.current.parentElement?.clientWidth || 600;
        canvasDigitalRef.current.width = canvasDigitalRef.current.parentElement?.clientWidth || 600;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeInput, waveFreq, samplingRate, bitDepth]);

  // Clean up audio sources only on unmount
  useEffect(() => {
    return () => {
      stopAllAudioSources();
    };
  }, []);

  // --- OBTENER CONTEXTO DE AUDIO ---
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // --- DETENER FUENTES DE AUDIO ---
  const stopAllAudioSources = () => {
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(track => track.stop());
      liveStreamRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (playingAudio) {
      stopDegradationAudio();
    }
  };

  // --- GENERACIÓN SINTÉTICA LOCAL ---
  const generateSynthSamples = () => {
    const length = originalSignal.current.length;
    const fsOriginalSim = 44100; // Simulación analógica estándar
    for (let i = 0; i < length; i++) {
      const t = (phaseRef.current + i) / fsOriginalSim;
      // Fundamental + un armónico menor para dar realismo a la señal analógica
      originalSignal.current[i] = 0.7 * Math.sin(2 * Math.PI * waveFreq * t) +
        0.18 * Math.sin(2 * Math.PI * (waveFreq * 2.2) * t);
    }
    phaseRef.current += 260; // Desplazamiento para simular movimiento continuo
  };

  // --- SINCRONIZACIÓN CON EL BACKEND FASTAPI ---
  const syncWithBackend = async () => {
    apiCallPendingRef.current = true;
    lastApiCallRef.current = Date.now();

    const signalArray = Array.from(originalSignal.current);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal: signalArray,
          sampling_rate: samplingRate,
          bit_depth: bitDepth,
          original_fs: 44.1
        })
      });

      if (!response.ok) {
        throw new Error('API local desconectada. Iniciando modo offline (simulación local).');
      }

      const result: ProcessResult = await response.json();

      // Actualizamos buffers y métricas con los cálculos reales del backend de Python
      digitalSignal.current = new Float32Array(result.processed_signal);
      setBitrate(result.bitrate);
      setLevels(result.levels);
      setSqnrTheoretical(result.sqnr_theoretical);
      setSqnrReal(result.sqnr_real);
      setError(null);
    } catch (err: any) {
      // Modo offline por si la API se está iniciando (soporte de robustez)
      runOfflineFallback();
      setError(err.message);
    } finally {
      apiCallPendingRef.current = false;
    }

    // Alerta de aliasing teórica: Fs <= 2 * waveFreq
    const maxFreqInput = activeInput === 'synth' ? waveFreq : 2500; // Estimación para mic/archivo
    if (samplingRate * 1000 <= 2 * maxFreqInput) {
      setAliasingDetected(true);
    } else {
      setAliasingDetected(false);
    }
  };

  // Simulación de fallback en frontend por si el servidor local está caído o cargando
  const runOfflineFallback = () => {
    const raw = originalSignal.current;
    const length = raw.length;
    const levelsCount = Math.pow(2, bitDepth);
    const stepSize = 2.0 / levelsCount;

    // Simulación de muestreo temporal
    const ratio = Math.max(1, Math.floor(44100 / (samplingRate * 1000)));
    const processed = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const sampledIdx = Math.floor(i / ratio) * ratio;
      const rawVal = raw[sampledIdx] || 0;
      // Cuantización de amplitud
      const quantizedVal = Math.round(rawVal / stepSize) * stepSize;
      processed[i] = quantizedVal;
    }

    digitalSignal.current = processed;
    setBitrate(samplingRate * bitDepth);
    setLevels(levelsCount);
    setSqnrTheoretical(6.02 * bitDepth + 1.76);
    setSqnrReal(6.02 * bitDepth + 0.5); // Estimación del SQNR real aproximado
  };

  // --- ENTRADA: MICRÓFONO ---
  const handleActivateMic = async () => {
    stopAllAudioSources();
    const ctx = getAudioContext();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      liveStreamRef.current = stream;
      setActiveInput('mic');
      setError(null);

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(1024, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        const step = Math.floor(inputBuffer.length / originalSignal.current.length);
        for (let i = 0; i < originalSignal.current.length; i++) {
          originalSignal.current[i] = inputBuffer[i * step] || 0;
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      sourceNodeRef.current = source;
      processorNodeRef.current = processor;
    } catch (err) {
      setError("No se pudo acceder al micrófono. Por favor, verifica los permisos.");
      setActiveInput('synth');
    }
  };

  // --- ENTRADA: ARCHIVO LOCAL ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopAllAudioSources();
    const ctx = getAudioContext();
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      uploadedBufferRef.current = decodedBuffer;
      setActiveInput('file');
      setError(null);

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.loop = true;

      const processor = ctx.createScriptProcessor(1024, 1, 1);
      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        const step = Math.floor(inputBuffer.length / originalSignal.current.length);
        for (let i = 0; i < originalSignal.current.length; i++) {
          originalSignal.current[i] = inputBuffer[i * step] || 0;
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      source.start(0);

      sourceNodeRef.current = source;
      processorNodeRef.current = processor;
    } catch (err) {
      setError("Error al decodificar el archivo de audio.");
      setActiveInput('synth');
    } finally {
      setLoading(false);
    }
  };

  // --- AUDIO DE MONITOREO (BITCRUSHER REAL CLIENT-SIDE) ---
  const startDegradationAudio = () => {
    const ctx = getAudioContext();
    setPlayingAudio(true);

    synthCrusherRef.current = ctx.createScriptProcessor(2048, 1, 1);
    synthCrusherRef.current.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);

      const rateHz = samplingRate * 1000;
      const samplePeriod = ctx.sampleRate / rateHz;
      const stepLevels = Math.pow(2, bitDepth);
      const stepSize = 2.0 / stepLevels;

      for (let i = 0; i < input.length; i++) {
        // Reducción temporal de muestreo (ZOH)
        const sampledIdx = Math.floor(i / samplePeriod) * samplePeriod;
        const rawVal = input[Math.floor(sampledIdx)] || 0;

        // Reducción de amplitud (cuantización)
        const quantizedVal = Math.round(rawVal / stepSize) * stepSize;
        output[i] = quantizedVal * 0.35; // Volumen atenuado por seguridad
      }
    };

    synthCrusherRef.current.connect(ctx.destination);

    if (activeInput === 'synth') {
      synthOscRef.current = ctx.createOscillator();
      synthOscRef.current.frequency.value = waveFreq;
      synthOscRef.current.connect(synthCrusherRef.current);
      synthOscRef.current.start();
    } else if (sourceNodeRef.current) {
      sourceNodeRef.current.connect(synthCrusherRef.current);
    }
  };

  const stopDegradationAudio = () => {
    setPlayingAudio(false);
    if (synthOscRef.current) {
      synthOscRef.current.stop();
      synthOscRef.current.disconnect();
      synthOscRef.current = null;
    }
    if (synthCrusherRef.current) {
      if (sourceNodeRef.current && activeInput !== 'synth') {
        try {
          sourceNodeRef.current.disconnect(synthCrusherRef.current);
        } catch(e) {}
      }
      synthCrusherRef.current.disconnect();
      synthCrusherRef.current = null;
    }
  };

  // --- DIBUJO DE CANVASEs ---
  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#1e2226';
    ctx.lineWidth = 1;

    const cols = 16;
    const rows = 8;
    for (let i = 1; i < cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (w / cols), 0);
      ctx.lineTo(i * (w / cols), h);
      ctx.stroke();
    }
    for (let i = 1; i < rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * (h / rows));
      ctx.lineTo(w, i * (h / rows));
      ctx.stroke();
    }

    // Línea central de referencia (0 Voltios)
    ctx.strokeStyle = '#32373d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  };

  const drawAnalogCanvas = () => {
    const canvas = canvasAnalogRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0a0b0d';
    ctx.fillRect(0, 0, w, h);

    drawGrid(ctx, w, h);

    // Dibujar trazo verde analógico analógico
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 4;
    ctx.beginPath();

    const length = originalSignal.current.length;
    const mid = h / 2;
    const amp = h * 0.4;

    for (let i = 0; i < w; i++) {
      const sampleIdx = Math.floor((i / w) * length);
      const val = originalSignal.current[sampleIdx] || 0;
      const x = i;
      const y = mid - (val * amp);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Desactivar sombras para optimizar
  };

  const drawDigitalCanvas = () => {
    const canvas = canvasDigitalRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0a0b0d';
    ctx.fillRect(0, 0, w, h);

    drawGrid(ctx, w, h);

    // Dibujar trazo ámbar escalonado (PCM)
    ctx.strokeStyle = '#ffa726';
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    const length = digitalSignal.current.length;
    const mid = h / 2;
    const amp = h * 0.4;

    let prevY = mid;

    for (let i = 0; i < w; i++) {
      const sampleIdx = Math.floor((i / w) * length);
      const val = digitalSignal.current[sampleIdx] || 0;
      const x = i;
      const y = mid - (val * amp);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, prevY); // Mantener el nivel anterior (ZOH)
        ctx.lineTo(x, y);
      }
      prevY = y;
    }
    ctx.stroke();

    // Dibujar puntos de muestreo (Impulsos PAM discretos)
    const rateHz = samplingRate * 1000;
    const pcmPeriod = 44100 / rateHz;
    const pixelPeriod = (w / length) * pcmPeriod;

    if (pixelPeriod >= 4) {
      ctx.fillStyle = '#00e676';
      for (let x = 0; x < w; x += pixelPeriod) {
        const sampleIdx = Math.floor((x / w) * length);
        const sampledIdx = Math.floor(sampleIdx / pcmPeriod) * pcmPeriod;
        const val = digitalSignal.current[Math.floor(sampledIdx)] || 0;
        const y = mid - (val * amp);

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  // --- EXPORTAR INFORME TXT ---
  const handleExportReport = () => {
    const content = `===========================================================
    INFORME DE SIMULACIÓN - CONVERSIÓN ANALÓGICO A DIGITAL
    CÁTEDRA DE COMUNICACIÓN DE DATOS - UTN FRLP
===========================================================

1. PARÁMETROS DEL SISTEMA DE ENTRADA:
   - Fuente del canal analógico: ${activeInput.toUpperCase()}
   - Frecuencia fundamental (Fm): ${activeInput === 'synth' ? waveFreq + ' Hz' : 'Señal externa compleja'}

2. PARÁMETROS DE DIGITALIZACIÓN (ADC):
   - Frecuencia de Muestreo (Fs): ${samplingRate.toFixed(1)} kHz
   - Período de muestreo (Ts): ${(1 / samplingRate).toFixed(4)} ms
   - Profundidad de Bits (b): ${bitDepth} bits/muestra

3. CARACTERÍSTICAS DEL CANAL DIGITALIZADO (TP1):
   - Niveles de Cuantización (L = 2^b): ${levels}
   - Tasa de Bits del Canal (R = Fs * b): ${bitrate.toFixed(1)} kbps
   - SQNR Teórica máxima: ${sqnrTheoretical.toFixed(2)} dB
   - SQNR Real simulada: ${sqnrReal.toFixed(2)} dB

4. DIAGNÓSTICO DE TRANSMISIÓN:
   - Frecuencia de Nyquist límite: ${(samplingRate * 1000 / 2).toFixed(0)} Hz
   - Presencia de Aliasing: ${aliasingDetected ? "SÍ (Frecuencia de Nyquist superada)" : "NO (Muestreo seguro)"}

===========================================================
PROYECTO INTEGRADO - GRUPO 5 - S32
===========================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `reporte_ADC_audio_${bitDepth}bits.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="w-full max-w-[1200px] bg-[#161719] border-2 border-[#25272a] rounded shadow-2xl flex flex-col overflow-hidden">

      {/* Cabezal de Instrumento */}
      <header className="px-6 py-4 bg-[#0f1011] border-b-2 border-[#25272a] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-pulse shadow-[0_0_8px_#00e676]"></span>
          <h1 className="font-mono text-xs uppercase tracking-widest font-bold text-slate-100">
            Analizador ADC de Audio // Modulador PCM
          </h1>
        </div>
        <div className="font-mono text-[10px] text-slate-500 tracking-wider flex items-center gap-2">
          <Server size={12} className="text-[#ffa726]" />
          {error ? (
            <span className="text-yellow-600 font-semibold flex items-center gap-1">
              ⚠️ Servidor Offline (Simulador Local Activo)
            </span>
          ) : (
            <span className="text-emerald-500 font-semibold">FastAPI Conectado</span>
          )}
        </div>
      </header>

      {/* Grilla Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-[600px]">

        {/* Panel Lateral de Controles */}
        <aside className="p-6 bg-[#131416] border-r-0 lg:border-r-2 border-[#25272a] flex flex-col gap-6">

          {/* SECCIÓN 1: Entrada */}
          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-[11px] text-slate-500 uppercase tracking-wider border-b border-[#25272a] pb-2">
              1. Entrada de Señal
            </h2>
            <button
              onClick={() => { stopAllAudioSources(); setActiveInput('synth'); }}
              className={`font-semibold text-xs py-2.5 px-4 rounded border text-left flex items-center gap-2 transition-all ${activeInput === 'synth'
                  ? 'bg-[rgba(0,230,118,0.06)] border-[#00e676] text-[#00e676]'
                  : 'bg-[#1b1c1e] border-[#25272a] text-slate-400 hover:border-[#383a3e]'
                }`}
            >
              <Activity size={14} /> Generador de Prueba
            </button>

            <button
              onClick={handleActivateMic}
              className={`font-semibold text-xs py-2.5 px-4 rounded border text-left flex items-center gap-2 transition-all ${activeInput === 'mic'
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
              <div className={`font-semibold text-xs py-2.5 px-4 rounded border text-left flex items-center gap-2 transition-all ${activeInput === 'file'
                  ? 'bg-[rgba(0,230,118,0.06)] border-[#00e676] text-[#00e676]'
                  : 'bg-[#1b1c1e] border-[#25272a] text-slate-400 hover:border-[#383a3e]'
                }`}>
                <Upload size={14} /> {loading ? "Decodificando..." : "Subir MP3/WAV"}
              </div>
            </label>
          </div>

          {/* SECCIÓN 2: Modulador Sintético */}
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
                max={2200}
                step={20}
                value={waveFreq}
                onChange={(e) => setWaveFreq(parseInt(e.target.value))}
                className="w-full accent-[#00e676]"
              />
            </div>
          )}

          {/* SECCIÓN 3: Modulación PCM */}
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

          {/* SECCIÓN 4: Métricas de Canal */}
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
              className={`w-full font-semibold text-xs py-2.5 px-4 rounded border flex items-center justify-center gap-2 transition-all ${playingAudio
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

        </aside>

        {/* Panel Derecho: Osciloscopios */}
        <main className="p-6 flex flex-col gap-6 bg-[#0a0b0d]">

          {/* Osciloscopio Original */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                Señal Analógica Original (Continua)
              </span>
              <span className="text-[#00e676] font-mono text-[10px] uppercase flex items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]"></span> Voltaje vs Tiempo
              </span>
            </div>
            <div className="bg-[#050607] border border-[#1e2226] rounded overflow-hidden">
              <canvas ref={canvasAnalogRef} className="w-full h-[180px]" />
            </div>
          </div>

          {/* Osciloscopio Digital */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                Señal Digitalizada (Discreta y Cuantizada PCM)
              </span>
              <div className="flex items-center gap-3">
                {aliasingDetected && (
                  <span className="text-[#ffa726] border border-[#ffa726] bg-[rgba(255,167,38,0.06)] font-mono text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                    ⚠️ ALIASING CRÍTICO
                  </span>
                )}
                <span className="text-[#ffa726] font-mono text-[10px] uppercase flex items-center gap-1.5 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffa726]"></span> Pasos de Retención (ZOH)
                </span>
              </div>
            </div>
            <div className="bg-[#050607] border border-[#1e2226] rounded overflow-hidden">
              <canvas ref={canvasDigitalRef} className="w-full h-[180px]" />
            </div>
          </div>

          {/* Panel Teórico de la Cátedra */}
          <div className="mt-auto bg-[#131416] border border-[#25272a] rounded p-4 flex flex-col gap-3">
            <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
              Diagnóstico y Análisis de Nyquist (Comunicaciones FRLP)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              El Teorema de Muestreo de Nyquist-Shannon establece que la frecuencia de muestreo $F_s$ debe ser estrictamente mayor al doble de la componente de frecuencia más alta de la señal original ($F_s &gt; 2 \cdot F_m$) para prevenir la superposición de espectros (aliasing). En este simulador, con una frecuencia de entrada de <strong className="text-[#00e676]">{waveFreq} Hz</strong>, requieres un muestreo de al menos <strong className="text-[#ffa726]">{(waveFreq * 2 / 1000).toFixed(2)} kHz</strong>.
            </p>
          </div>

        </main>

      </div>

      {/* Footer Fórmulas */}
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

    </div>
  );
}