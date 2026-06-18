import { useState, useEffect, useRef, useCallback } from 'react';

export interface ProcessResult {
  processed_signal: number[];
  bitrate: number;
  levels: number;
  sqnr_theoretical: number;
  sqnr_real: number;
}

export type InputType = 'synth' | 'mic' | 'file';

export function useADCSystem() {
  // --- ESTADO DE PARÁMETROS DEL ADC ---
  const [activeInput, setActiveInput] = useState<InputType>('synth');
  const [waveFreq, setWaveFreq] = useState<number>(440);
  const [samplingRate, setSamplingRate] = useState<number>(8.0);
  const [bitDepth, setBitDepth] = useState<number>(8);
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const uploadedBufferRef = useRef<AudioBuffer | null>(null);

  // Buffer local de muestras original para procesar (512 puntos)
  const originalSignal = useRef<Float32Array>(new Float32Array(512));
  const digitalSignal = useRef<Float32Array>(new Float32Array(512));

  // Variables auxiliares de animación y throttling
  const phaseRef = useRef<number>(0);
  const lastApiCallRef = useRef<number>(0);
  const apiCallPendingRef = useRef<boolean>(false);
  const animationRef = useRef<number>(0);
  const samplingRateRef = useRef<number>(samplingRate);
  const bitDepthRef = useRef<number>(bitDepth);

  useEffect(() => {
    samplingRateRef.current = samplingRate;
    bitDepthRef.current = bitDepth;
  }, [samplingRate, bitDepth]);

  // --- REPRODUCTOR INTEGRADO DE DEGRADACIÓN (BITCRUSHER) ---
  const synthOscRef = useRef<OscillatorNode | null>(null);
  const synthCrusherRef = useRef<ScriptProcessorNode | null>(null);

  const stopDegradationAudio = useCallback(() => {
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
  }, [activeInput]);

  const stopAllAudioSources = useCallback(() => {
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
  }, [playingAudio, stopDegradationAudio]);

  // Clean up audio sources only on unmount
  useEffect(() => {
    return () => {
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
      }
      if (synthOscRef.current) {
        synthOscRef.current.disconnect();
      }
      if (synthCrusherRef.current) {
        synthCrusherRef.current.disconnect();
      }
    };
  }, []);

  // --- OBTENER CONTEXTO DE AUDIO ---
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const generateSynthSamples = useCallback(() => {
    const length = originalSignal.current.length;
    const fsOriginalSim = 44100;
    for (let i = 0; i < length; i++) {
      const t = (phaseRef.current + i) / fsOriginalSim;
      originalSignal.current[i] = 0.7 * Math.sin(2 * Math.PI * waveFreq * t) +
        0.18 * Math.sin(2 * Math.PI * (waveFreq * 2.2) * t);
    }
    phaseRef.current += 260;
  }, [waveFreq]);

  const runOfflineFallback = useCallback(() => {
    const raw = originalSignal.current;
    const length = raw.length;
    const levelsCount = Math.pow(2, bitDepth);
    const stepSize = 2.0 / levelsCount;
    const ratio = Math.max(1, Math.floor(44100 / (samplingRate * 1000)));
    const processed = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const sampledIdx = Math.floor(i / ratio) * ratio;
      const rawVal = raw[sampledIdx] || 0;
      const quantizedVal = Math.round(rawVal / stepSize) * stepSize;
      processed[i] = quantizedVal;
    }

    digitalSignal.current = processed;
    setBitrate(samplingRate * bitDepth);
    setLevels(levelsCount);
    setSqnrTheoretical(6.02 * bitDepth + 1.76);
    setSqnrReal(6.02 * bitDepth + 0.5);
  }, [bitDepth, samplingRate]);

  const syncWithBackend = useCallback(async () => {
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
      digitalSignal.current = new Float32Array(result.processed_signal);
      setBitrate(result.bitrate);
      setLevels(result.levels);
      setSqnrTheoretical(result.sqnr_theoretical);
      setSqnrReal(result.sqnr_real);
      setError(null);
    } catch (err: any) {
      runOfflineFallback();
      setError(err.message);
    } finally {
      apiCallPendingRef.current = false;
    }

    const maxFreqInput = activeInput === 'synth' ? waveFreq : 2500;
    if (samplingRate * 1000 <= 2 * maxFreqInput) {
      setAliasingDetected(true);
    } else {
      setAliasingDetected(false);
    }
  }, [activeInput, bitDepth, samplingRate, waveFreq, runOfflineFallback]);

  // --- INICIALIZACIÓN DE BUCLE PRINCIPAL ---
  useEffect(() => {
    if (activeInput === 'synth') {
      generateSynthSamples();
    }

    const renderLoop = () => {
      if (activeInput === 'synth') {
        generateSynthSamples();
      }
      
      const now = Date.now();
      if (now - lastApiCallRef.current > 150 && !apiCallPendingRef.current) {
        syncWithBackend();
      }
      animationRef.current = requestAnimationFrame(renderLoop);
    };

    animationRef.current = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [activeInput, generateSynthSamples, syncWithBackend]);


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

  const startDegradationAudio = useCallback(() => {
    const ctx = getAudioContext();
    setPlayingAudio(true);

    synthCrusherRef.current = ctx.createScriptProcessor(2048, 1, 1);
    synthCrusherRef.current.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      const rateHz = samplingRateRef.current * 1000;
      const samplePeriod = ctx.sampleRate / rateHz;
      const stepLevels = Math.pow(2, bitDepthRef.current);
      const stepSize = 2.0 / stepLevels;

      for (let i = 0; i < input.length; i++) {
        const sampledIdx = Math.floor(i / samplePeriod) * samplePeriod;
        const rawVal = input[Math.floor(sampledIdx)] || 0;
        const quantizedVal = Math.round(rawVal / stepSize) * stepSize;
        output[i] = quantizedVal * 0.35;
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
  }, [activeInput, bitDepth, getAudioContext, samplingRate, waveFreq]);

  const handleExportReport = useCallback(() => {
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
  }, [activeInput, aliasingDetected, bitDepth, bitrate, levels, samplingRate, sqnrReal, sqnrTheoretical, waveFreq]);

  return {
    state: {
      activeInput,
      waveFreq,
      samplingRate,
      bitDepth,
      playingAudio,
      loading,
      error,
      bitrate,
      levels,
      sqnrTheoretical,
      sqnrReal,
      aliasingDetected,
    },
    actions: {
      setActiveInput,
      setWaveFreq,
      setSamplingRate,
      setBitDepth,
      stopAllAudioSources,
      handleActivateMic,
      handleFileUpload,
      startDegradationAudio,
      stopDegradationAudio,
      handleExportReport,
    },
    refs: {
      originalSignal,
      digitalSignal,
    }
  };
}
