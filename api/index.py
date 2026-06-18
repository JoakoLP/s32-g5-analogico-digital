from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import math

app = FastAPI(title="Laboratorio ADC Audio - Backend")

# Habilitamos CORS para desarrollo local fluido (Antigravity IDE y React local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo de datos para validar la consulta (entrada)
class PeticionProcesamiento(BaseModel):
    signal: list[float]        # Arreglo de amplitudes de la señal de entrada [-1.0, 1.0]
    sampling_rate: float       # Frecuencia de muestreo (Fs) a simular en kHz (ej: 8.0)
    bit_depth: int             # Resolución de bits de cuantización (b) (ej: 8)
    original_fs: float = 44.1  # Frecuencia origen del dispositivo de audio en kHz (estándar 44.1)

@app.post("/api/process")
async def procesar_adc(req: PeticionProcesamiento):
    # Convertimos la señal a un arreglo NumPy para manipulación eficiente
    x = np.array(req.signal)
    n_muestras = len(x)
    
    if n_muestras == 0:
        return {"error": "Buffer de señal vacío"}

    # 1. SIMULACIÓN DE MUESTREO (Downsampling + Retención de Orden Cero - ZOH)
    # Calculamos la relación de submuestreo respecto al hardware origen
    relacion_muestreo = max(1, int((req.original_fs * 1000) / (req.sampling_rate * 1000)))
    
    # Creamos un arreglo del mismo tamaño para mantener la escala visual en los gráficos
    senal_muestreada = np.zeros_like(x)
    for i in range(0, n_muestras, relacion_muestreo):
        valor_muestreado = x[i]
        # Aplicamos Retención de Orden Cero (ZOH): el valor se mantiene constante hasta la siguiente muestra
        senal_muestreada[i:min(i + relacion_muestreo, n_muestras)] = valor_muestreado

    # 2. SIMULACIÓN DE CUANTIZACIÓN (PCM Lineal)
    # Calculamos los niveles de cuantización discretos disponibles: L = 2^b
    niveles = 2 ** req.bit_depth
    
    # Normalizamos la señal temporalmente al rango [0, 1] para aplicar escalamiento discreto
    senal_normalizada = (senal_muestreada + 1.0) / 2.0
    
    # Mapeamos los niveles continuos a los escalones enteros discretos más cercanos
    pasos_discretos = np.round(senal_normalizada * (niveles - 1))
    
    # Desnormalizamos los escalones de vuelta a la escala de voltaje física [-1.0, 1.0]
    senal_cuantizada = (pasos_discretos / (niveles - 1)) * 2.0 - 1.0

    # 3. CÁLCULOS ACADÉMICOS Y MÉTRICAS DE CANAL (Teoría UTN)
    # Tasa de bits de transmisión (Bitrate) en kbps: R = Fs * b
    bitrate = req.sampling_rate * req.bit_depth

    # SQNR Teórico (dB) = 6.02 * b + 1.76
    sqnr_teorico = 6.02 * req.bit_depth + 1.76

    # SQNR Real (dB) = 10 * log10( Potencia_Señal_Original / Potencia_Ruido_Cuantizacion )
    potencia_senal = np.mean(x ** 2)
    
    # Ruido o error de cuantización (e = x - xq)
    ruido = x - senal_cuantizada
    potencia_ruido = np.mean(ruido ** 2)

    if potencia_ruido > 0 and potencia_senal > 0:
        sqnr_real = 10 * math.log10(potencia_senal / potencia_ruido)
    else:
        sqnr_real = 99.9  # Caso ideal sin pérdidas (ej: resolución infinita)

    # Devolvemos el paquete de datos estructurado en formato JSON
    return {
        "processed_signal": senal_cuantizada.tolist(),
        "bitrate": round(bitrate, 2),
        "levels": niveles,
        "sqnr_theoretical": round(sqnr_teorico, 2),
        "sqnr_real": round(sqnr_real, 2)
    }