import { useEffect, type RefObject } from 'react';

interface OscilloscopeProps {
  title: string;
  subtitle: string;
  color: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  signal: React.MutableRefObject<Float32Array>;
  isDigital?: boolean;
  samplingRate?: number; // Only for digital to draw dots
  aliasingDetected?: boolean; // Only for digital warning
}

export function Oscilloscope({
  title,
  subtitle,
  color,
  canvasRef,
  signal,
  isDigital = false,
  samplingRate = 8.0,
  aliasingDetected = false
}: OscilloscopeProps) {
  
  // Custom drawing loop logic is maintained here or passed from parent,
  // but to keep App.tsx clean, the drawing logic itself is here.
  useEffect(() => {
    let animationId: number;

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
      ctx.strokeStyle = '#32373d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    };

    const drawAnalog = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.beginPath();

      const length = signal.current.length;
      const mid = h / 2;
      const amp = h * 0.4;

      for (let i = 0; i < w; i++) {
        const sampleIdx = Math.floor((i / w) * length);
        const val = signal.current[sampleIdx] || 0;
        const x = i;
        const y = mid - (val * amp);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawDigital = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();

      const length = signal.current.length;
      const mid = h / 2;
      const amp = h * 0.4;

      let prevY = mid;

      for (let i = 0; i < w; i++) {
        const sampleIdx = Math.floor((i / w) * length);
        const val = signal.current[sampleIdx] || 0;
        const x = i;
        const y = mid - (val * amp);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        }
        prevY = y;
      }
      ctx.stroke();

      const rateHz = samplingRate * 1000;
      const pcmPeriod = 44100 / rateHz;
      const pixelPeriod = (w / length) * pcmPeriod;

      if (pixelPeriod >= 4) {
        ctx.fillStyle = '#00e676';
        for (let x = 0; x < w; x += pixelPeriod) {
          const sampleIdx = Math.floor((x / w) * length);
          const sampledIdx = Math.floor(sampleIdx / pcmPeriod) * pcmPeriod;
          const val = signal.current[Math.floor(sampledIdx)] || 0;
          const y = mid - (val * amp);

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0a0b0d';
      ctx.fillRect(0, 0, w, h);

      drawGrid(ctx, w, h);

      if (isDigital) {
        drawDigital(ctx, w, h);
      } else {
        drawAnalog(ctx, w, h);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.parentElement?.clientWidth || 600;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef, color, isDigital, samplingRate, signal]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-3">
          {isDigital && aliasingDetected && (
            <span className="text-[#ffa726] border border-[#ffa726] bg-[rgba(255,167,38,0.06)] font-mono text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
              ⚠️ ALIASING CRÍTICO
            </span>
          )}
          <span className={`text-[${color}] font-mono text-[10px] uppercase flex items-center gap-1.5 font-semibold`}>
            <span className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: color }}></span> {subtitle}
          </span>
        </div>
      </div>
      <div className="bg-[#050607] border border-[#1e2226] rounded overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-[180px]" />
      </div>
    </div>
  );
}
