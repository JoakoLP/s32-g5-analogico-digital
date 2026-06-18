import { Server } from 'lucide-react';

interface HeaderProps {
  error: string | null;
}

export function Header({ error }: HeaderProps) {
  return (
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
  );
}
