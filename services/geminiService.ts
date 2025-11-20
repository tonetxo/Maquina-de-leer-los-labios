import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

const API_KEY = process.env.API_KEY || '';

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:video/webm;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const analyzeLipReading = async (videoBlob: Blob, language: string): Promise<AnalysisResult> => {
  if (!API_KEY) {
    throw new Error("API Key non atopada. Configura o teu process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const base64Data = await blobToBase64(videoBlob);

    // Map 'auto' to a more descriptive instruction
    const languageContext = language === 'auto' 
      ? "Español, Galego, Inglés ou Portugués (detecta automaticamente)." 
      : language;

    const prompt = `### ROL
Eres un experto forense en lectura de labios (VSR) y fonética visual. Tu tarea es transcribir el habla silenciosa basándote en una secuencia de video centrada en la boca del hablante.

### CONTEXTO
El idioma objetivo es: ${languageContext}.
El video es un primer plano recortado de la boca.

### INSTRUCCIONES PASO A PASO
1.  **Análisis de Visemas:** Analiza cuadro por cuadro los movimientos clave. Identifica:
    * Apertura de la mandíbula (cerrada, media, abierta).
    * Forma de los labios (estirados, redondeados, neutros).
    * Posición de la lengua (visible, detrás de los dientes, tocando el paladar).
    * Interacción dental (mordida del labio inferior, dientes visibles).

2.  **Mapeo Fonético:** Agrupa estos movimientos en posibles sílabas o palabras candidatas. Ten en cuenta que sonidos como /p/, /b/, /m/ se ven igual, al igual que /f/ y /v/. Usa el contexto gramatical para desambiguar.

3.  **Transcripción:** Genera la frase más probable que coincida lógica y gramaticalmente con los movimientos observados.

### FORMATO DE SALIDA
Responde ÚNICAMENTE con este JSON:
{
  "analisis_movimiento": "Descripción técnica breve de lo observado (ej: inicio bilabial, seguido de vocal abierta...).",
  "candidatos": ["palabra_posible_1", "palabra_posible_2"],
  "transcripcion_final": "La frase exacta.",
  "nivel_de_confianza": "Bajo/Medio/Alto"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: videoBlob.type || 'video/webm',
              data: base64Data,
            },
          },
          {
            text: prompt
          },
        ],
      },
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text || '{}';
    let resultData;
    
    try {
      resultData = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse JSON", jsonText);
      return {
        text: "Erro ao interpretar a resposta.",
        details: "Non se puido ler o formato JSON."
      };
    }

    return {
      text: resultData.transcripcion_final || "Non se puido transcribir.",
      confidence: resultData.nivel_de_confianza,
      details: resultData.analisis_movimiento,
      candidates: resultData.candidatos
    };

  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw error;
  }
};