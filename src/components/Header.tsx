import { Server, Code } from 'lucide-react';

interface HeaderProps {
  error: string | null;
  currentView: 'simulator' | 'theory';
  onToggleView: () => void;
}

export function Header({ error, currentView, onToggleView }: HeaderProps) {
  return (
    <header className="px-6 py-4 bg-[#0f1011] border-b-2 border-[#25272a] flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-pulse shadow-[0_0_8px_#00e676]"></span>
          <h1 className="font-mono text-xs uppercase tracking-widest font-bold text-slate-100">
            Analizador ADC de Audio // Modulador PCM
          </h1>
        </div>
        <button
          onClick={onToggleView}
          className="ml-4 px-3 py-1 bg-[#1f2124] hover:bg-[#27292d] border border-[#2b2d31] hover:border-[#4a4e54] text-xs text-slate-300 rounded font-mono uppercase tracking-wider transition-colors"
        >
          {currentView === 'simulator' ? '📖 Ver Apuntes Teóricos' : '🎛️ Volver al Simulador'}
        </button>
      </div>
      <div className="flex items-center gap-6">
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
        
        <a 
          href="https://github.com/JoakoLP/s32-g5-analogico-digital" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1b1e] hover:bg-[#25272a] border border-[#2b2d31] hover:border-[#4a4e54] text-slate-300 hover:text-white rounded transition-colors"
          title="Ver Repositorio en GitHub"
        >
          <Code size={14} />
          <span className="font-mono text-[10px] uppercase tracking-wider font-bold">GitHub</span>
        </a>
      </div>
    </header>
  );
}
