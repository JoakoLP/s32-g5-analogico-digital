import React from 'react';

interface TheoryPageProps {
  onBack: () => void;
}

export const TheoryPage: React.FC<TheoryPageProps> = ({ onBack }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#0a0b0d] text-slate-300 overflow-y-auto">
      <header className="border-b border-[#25272a] px-8 py-6 flex justify-between items-center sticky top-0 bg-[#0a0b0d] z-10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Apuntes Teóricos: Conversión Analógica a Digital</h1>
          <p className="text-sm text-slate-400 font-mono">Basado en la currícula de Comunicaciones FRLP (Unidades 1, 2, 4, 6 y 8)</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#131416] border border-[#25272a] rounded hover:border-[#ffa726] hover:text-[#ffa726] transition-colors font-mono text-sm uppercase tracking-wider"
        >
          🎛️ Volver al Simulador
        </button>
      </header>

      <div className="max-w-4xl mx-auto flex flex-col gap-10 mt-8 pb-12 px-6 w-full">
        
        {/* Sección 1: Conceptos Básicos */}
        <section className="bg-[#131416] border border-[#25272a] rounded p-6 shadow-lg">
          <h2 className="text-[#29b6f6] font-mono text-lg uppercase tracking-wider mb-4 border-b border-[#25272a] pb-2">
            1. Señales Analógicas vs. Digitales (Unidad 1 y 6)
          </h2>
          <p className="leading-relaxed mb-4">
            Una <strong>señal analógica</strong> es continua tanto en el tiempo como en amplitud (ej. una onda senoidal pura de voz). Para que una computadora pueda procesarla, almacenarla o transmitirla digitalmente, es necesario convertirla a una <strong>señal digital</strong>, la cual es discreta en el tiempo y discreta en amplitud.
          </p>
          <p className="leading-relaxed">
            Este proceso de Conversión Analógica a Digital (ADC) consta de tres etapas fundamentales:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2 text-slate-400">
            <li><strong>Muestreo (Sampling):</strong> Discretización en el eje del tiempo.</li>
            <li><strong>Cuantificación (Quantization):</strong> Discretización en el eje de la amplitud.</li>
            <li><strong>Codificación (Encoding):</strong> Asignación de bits (unos y ceros) a cada nivel cuantizado.</li>
          </ul>
        </section>

        {/* Sección 2: Muestreo y Nyquist */}
        <section className="bg-[#131416] border border-[#25272a] rounded p-6 shadow-lg">
          <h2 className="text-[#00e676] font-mono text-lg uppercase tracking-wider mb-4 border-b border-[#25272a] pb-2">
            2. Muestreo y Teorema de Nyquist-Shannon (Unidad 2 y 8)
          </h2>
          <p className="leading-relaxed mb-4">
            El <strong>muestreo</strong> consiste en tomar el valor de la señal analógica en intervalos de tiempo regulares, conocidos como el período de muestreo ($T_s$). Su inversa es la <strong>Frecuencia de Muestreo ($F_s$)</strong>.
          </p>
          <div className="bg-[#0a0b0d] border border-[#1e2226] p-4 rounded mb-4 font-mono text-center">
            <span className="text-[#00e676]">Teorema de Nyquist:</span> F_s &gt; 2 · F_m
          </div>
          <p className="leading-relaxed">
            El matemático Harry Nyquist demostró que para poder reconstruir una señal analógica a partir de sus muestras discretas sin pérdida de información, la frecuencia de muestreo $F_s$ debe ser estrictamente mayor al doble de la componente de mayor frecuencia de la señal original ($F_m$).
          </p>
          <h3 className="text-white mt-4 mb-2 font-semibold">¿Qué pasa si no se cumple? (Aliasing)</h3>
          <p className="leading-relaxed">
            Si se muestrea por debajo del límite de Nyquist, ocurre un fenómeno destructivo llamado <strong>Aliasing</strong> (Solapamiento). En el dominio de la frecuencia, los espectros periódicos de la señal muestreada se solapan, haciendo imposible separar la banda base original mediante un filtro pasa-bajos. En el dominio del tiempo, la señal reconstruida parecerá ser de una frecuencia mucho más baja que la real.
          </p>
        </section>

        {/* Sección 3: Cuantización */}
        <section className="bg-[#131416] border border-[#25272a] rounded p-6 shadow-lg">
          <h2 className="text-[#ffa726] font-mono text-lg uppercase tracking-wider mb-4 border-b border-[#25272a] pb-2">
            3. Cuantización y Retención (ZOH) (Unidad 8)
          </h2>
          <p className="leading-relaxed mb-4">
            Una vez muestreada la señal en el tiempo, debemos aproximar su amplitud infinita a un número finito de escalones de voltaje predefinidos. Esto es la <strong>cuantización</strong>.
          </p>
          <p className="leading-relaxed mb-4">
            El número de escalones o <strong>Niveles de Cuantización ($L$)</strong> depende directamente de la profundidad de bits ($b$) asignada al conversor:
          </p>
          <div className="bg-[#0a0b0d] border border-[#1e2226] p-4 rounded mb-4 font-mono text-center">
            <span className="text-[#ffa726]">Niveles L:</span> L = 2^b
          </div>
          <p className="leading-relaxed">
            Por ejemplo, si utilizamos 8 bits, tendremos $2^8 = 256$ niveles distintos para representar la onda. Al redondear el valor real al escalón más cercano, introducimos un error irreversible conocido como <strong>Error de Cuantización</strong> o Ruido de Cuantización. Visualmente en el osciloscopio, esto genera el efecto de "escalera" o Retención de Orden Cero (ZOH).
          </p>
        </section>

        {/* Sección 4: PCM y Canal */}
        <section className="bg-[#131416] border border-[#25272a] rounded p-6 shadow-lg">
          <h2 className="text-purple-400 font-mono text-lg uppercase tracking-wider mb-4 border-b border-[#25272a] pb-2">
            4. Modulación por Pulsos Codificados (PCM) y Tasa de Bits (Unidad 4 y 8)
          </h2>
          <p className="leading-relaxed mb-4">
            PCM (Pulse Code Modulation) es el método estándar para la codificación digital de audio. En PCM puro (lineal), cada muestra cuantizada es representada por una palabra binaria independiente de tamaño $b$.
          </p>
          <p className="leading-relaxed mb-4">
            Para transmitir esta señal por el canal digital, requerimos una <strong>Tasa de Bits o Bitrate ($R$)</strong>, que determina el ancho de banda digital necesario:
          </p>
          <div className="bg-[#0a0b0d] border border-[#1e2226] p-4 rounded mb-4 font-mono text-center">
            <span className="text-purple-400">Tasa de Bits R:</span> R = F_s · b
          </div>
          <p className="leading-relaxed">
            Un CD de audio convencional usa una frecuencia de muestreo de 44.1 kHz (para superar el límite humano de audición de 20 kHz por Nyquist) y 16 bits de cuantización en 2 canales (estéreo). Su Bitrate puro PCM es altísimo: $44100 · 16 · 2 = 1.411$ Mbps.
          </p>
        </section>

        {/* Sección 5: SQNR */}
        <section className="bg-[#131416] border border-[#25272a] rounded p-6 shadow-lg">
          <h2 className="text-red-400 font-mono text-lg uppercase tracking-wider mb-4 border-b border-[#25272a] pb-2">
            5. Relación Señal a Ruido de Cuantización (SQNR)
          </h2>
          <p className="leading-relaxed mb-4">
            El error generado al redondear la señal analógica original a escalones discretos se comporta como un ruido "blanco" añadido a la señal. La calidad técnica de un sistema PCM se mide por su <strong>Signal-to-Quantization-Noise Ratio (SQNR)</strong>.
          </p>
          <p className="leading-relaxed mb-4">
            Para una onda senoidal en su rango dinámico máximo (full scale), el SQNR se calcula de forma logarítmica (en Decibelios, dB) utilizando la siguiente aproximación matemática:
          </p>
          <div className="bg-[#0a0b0d] border border-[#1e2226] p-4 rounded mb-4 font-mono text-center">
            <span className="text-red-400">SQNR:</span> ≈ 6.02 · b + 1.76 dB
          </div>
          <p className="leading-relaxed">
            Esta es la regla de oro del audio digital: <strong>"Cada bit adicional aporta aproximadamente 6 dB de margen dinámico al sistema"</strong>. Un sistema de 8 bits (telefonía clásica) tiene unos modestos ~50 dB de margen, mientras que un sistema moderno de 24 bits supera los 144 dB de rango dinámico, ocultando el ruido de cuantización por debajo del umbral de ruido térmico de la electrónica.
          </p>
        </section>

        {/* Sección 6: Parámetros del Simulador */}
        <section className="bg-[#131416] border border-[#25272a] rounded p-6 shadow-lg mb-8">
          <h2 className="text-[#e2e6ea] font-mono text-lg uppercase tracking-wider mb-4 border-b border-[#25272a] pb-2">
            6. Efecto de los Parámetros en el Simulador
          </h2>
          <p className="leading-relaxed mb-6">
            Al utilizar los controles del simulador, estás alterando físicamente el proceso de digitalización en tiempo real. Aquí te explicamos cómo repercute cada ajuste en la salida:
          </p>
          
          <div className="flex flex-col gap-6">
            <div className="bg-[#0a0b0d] border border-[#1e2226] p-4 rounded">
              <h3 className="text-[#00e676] font-mono mb-2">▶ Frecuencia Fundamental ($F_m$)</h3>
              <p className="text-sm">Controla la rapidez de oscilación de la señal analógica original. Si aumentas mucho esta frecuencia sin subir la Tasa de Muestreo, cruzarás el límite de Nyquist y verás cómo el osciloscopio digital (naranja) comienza a mostrar una onda completamente distinta (Aliasing) o incluso se queda estático.</p>
            </div>

            <div className="bg-[#0a0b0d] border border-[#1e2226] p-4 rounded">
              <h3 className="text-[#ffa726] font-mono mb-2">▶ Tasa de Muestreo ($F_s$)</h3>
              <p className="text-sm">Determina cuántas "fotos" de la señal se toman por segundo. Si la aumentas, verás que los escalones horizontales (ZOH) se hacen más angostos, capturando mejor las variaciones rápidas de la onda y evitando el Aliasing. La desventaja es que aumenta proporcionalmente la Tasa de Bits del Canal ($R$).</p>
            </div>

            <div className="bg-[#0a0b0d] border border-[#1e2226] p-4 rounded">
              <h3 className="text-purple-400 font-mono mb-2">▶ Cuantización ($b$)</h3>
              <p className="text-sm">Define la cantidad de escalones verticales posibles ($L$). Si la bajas (ej. 2 o 3 bits), verás saltos muy bruscos en la onda digitalizada, lo que al escucharla con la herramienta de degradación ("Bitcrusher") sonará como un ruido robótico muy fuerte (Ruido de Cuantización alto, SQNR bajo). Si la subes, la onda se vuelve mucho más suave y fiel a la original, a costa de aumentar el peso del archivo.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
