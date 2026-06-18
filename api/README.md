# Backend del Simulador de Audio (FastAPI) ⚙️

Este directorio contiene la Interfaz de Programación de Aplicaciones (API) escrita en Python (FastAPI). Sirve como un motor de procesamiento backend opcional para el simulador frontend.

## 🎯 ¿Por qué usar un backend en Python?

Aunque el frontend (React + Web Audio API) es completamente capaz de realizar la cuantización localmente usando JavaScript (y de hecho cuenta con un mecanismo de *fallback* si la API se apaga), tener un motor backend estructurado tiene varias ventajas académicas:
1. **Delegación de Carga (Offloading):** El navegador web envía ráfagas de arrays de flotantes (`Float32Array`) al servidor. Python procesa pesadas simulaciones numéricas y devuelve el array codificado, aliviando el hilo principal (Main Thread) del navegador.
2. **Modelo Cliente-Servidor (Telecomunicaciones):** Representa fielmente un sistema de telecomunicaciones real. El frontend actúa como el ADC local de un usuario, la API actúa como el canal/transmisor, y el payload HTTP JSON actúa como la codificación de línea.
3. **Escalabilidad:** En el futuro se pueden incorporar algoritmos en Python (ej. `numpy`, `scipy`) para generar compresiones como $\mu$-law, A-law o añadir simulaciones de ruido gaussiano al canal.

## 📂 Estructura de la API

```text
api/
├── __pycache__/          # Archivos precompilados de Python
├── venv/                 # Entorno virtual (dependencias locales)
├── index.py              # Código principal: endpoints FastAPI y algoritmos matemáticos
├── requirements.txt      # Listado de dependencias (fastapi, uvicorn, pydantic)
└── README.md             # Este archivo
```

## 📦 Instalación

Asegúrate de tener Python 3.9 o superior instalado.

1. Crea un entorno virtual (recomendado):
```bash
python -m venv venv
# Activar en Windows:
venv\Scripts\activate
# Activar en macOS/Linux:
source venv/bin/activate
```

2. Instala las dependencias:
```bash
pip install fastapi uvicorn pydantic
```

## 🚀 Ejecución

Para levantar el servidor de desarrollo con recarga automática (*hot-reload*):

```bash
python -m uvicorn index:app --reload --port 8000
```

El servidor estará escuchando peticiones locales en `http://localhost:8000`. 
El frontend Vite está pre-configurado (en `vite.config.ts`) para interceptar todas las llamadas a `/api` y hacer un *proxy* hacia este puerto automáticamente.
