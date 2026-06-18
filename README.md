# Simulador de Conversión Analógica a Digital (Audio) 🎛️
**Proyecto G5 S32 - Trabajo Práctico Integrador (Etapa 2)**  
*Cátedra de Comunicación de Datos - UTN FRLP*

Este proyecto es un simulador web interactivo diseñado para enseñar y visualizar el proceso completo de digitalización de señales de audio. Permite experimentar en tiempo real con los parámetros fundamentales de un Conversor Analógico-Digital (ADC) y observar matemáticamente y gráficamente el impacto en la señal resultante.

## 🚀 Características Principales

- **Fuentes de Audio Múltiples:** 
  - *Generador de Funciones:* Onda senoidal pura (configurable) con un armónico para simular complejidad.
  - *Micrófono en vivo:* Visualización y digitalización de tu propia voz en tiempo real.
  - *Archivos Locales:* Carga de pistas de audio para analizar la retención.
- **Visualización en Tiempo Real:** Dos osciloscopios de alto rendimiento (HTML5 Canvas) que contrastan la señal analógica original continua vs. la señal digitalizada discreta (escalonada por el circuito ZOH).
- **Control Total del ADC:**
  - Ajuste de **Tasa de Muestreo ($F_s$)** para experimentar con el Teorema de Nyquist y provocar o evitar el *Aliasing*.
  - Ajuste de **Profundidad de Cuantización ($b$)** desde 2 hasta 16 bits para observar la creación de niveles discretos ($L$).
- **Métricas Matemáticas en Vivo:** Cálculo instantáneo de Tasa de Bits del Canal ($R$), Niveles de Cuantización ($L$) y Relación Señal a Ruido (SQNR teórica y real).
- **Herramienta de Degradación (Bitcrusher):** Posibilidad de *escuchar* el ruido de cuantización generado al forzar la señal a bajas tasas de bits.
- **Soporte Teórico Integrado:** Una sección completa navegable que relaciona directamente el comportamiento del simulador con los apuntes teóricos de la cátedra.

## 📂 Estructura de Archivos

```text
s32-g5-analogico-digital/
├── api/                  # Backend FastAPI (Procesamiento numérico)
├── docs/                 # Documentación y apuntes de la cátedra
├── public/               # Audios de prueba y estáticos
├── src/                  # Código fuente Frontend (React)
│   ├── components/       # Componentes de UI (Osciloscopios, Paneles)
│   ├── hooks/            # Lógica central de ADC (useADCSystem.ts)
│   ├── App.tsx           # Layout principal y ruteo
│   └── main.tsx          # Punto de entrada de Vite
├── tailwind.config.js    # Configuración de los estilos visuales
└── vite.config.ts        # Configuración del empaquetador
```

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React (TypeScript) + Vite
- **Estilos:** TailwindCSS (con una temática oscura de equipamiento de laboratorio)
- **Audio/Procesamiento:** Web Audio API (`AudioContext`, `ScriptProcessorNode`, `OscillatorNode`)
- **Backend (Procesamiento Externo Opcional):** FastAPI (Python) para delegar algoritmos complejos o actuar como el canal de transmisión.

## ⚙️ Instalación y Ejecución Local

Este proyecto consta de dos partes: el cliente frontend en React y el servidor backend en Python.

### 1. Levantar el Backend (FastAPI)
Abre una terminal y dirígete a la carpeta `/api`:
```bash
cd api
pip install fastapi uvicorn
# Ejecuta el servidor en el puerto 8000
python -m uvicorn index:app --reload --port 8000
```

### 2. Levantar el Frontend (React + Vite)
Abre una nueva terminal en la raíz de este proyecto (`s32-g5-analogico-digital`):
```bash
npm install
# Levanta el servidor de desarrollo en http://localhost:5173/ (o 5174 si el puerto está en uso)
npm run dev
```

Una vez que ambos servidores estén corriendo, abre tu navegador en la URL que Vite te indique (por defecto `http://localhost:5173/`).

## 📚 Módulos Teóricos que abarca
Este simulador pone en práctica de forma visual los conceptos de:
- **Unidad 1 y 6:** Señales Analógicas vs. Digitales.
- **Unidad 2 y 8:** Muestreo y Teorema de Nyquist-Shannon (Aliasing).
- **Unidad 8:** Cuantización y Retención de Orden Cero (ZOH). Error de Cuantización (SQNR).
- **Unidad 4 y 8:** Modulación PCM Lineal y cálculo de Tasa de Bits del canal base.

---
*Desarrollado para la materia Comunicación de Datos.*
