import { GoogleGenAI } from "@google/genai";

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

export const analyzeLipReading = async (videoBlob: Blob, language: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key non atopada. Configura o teu process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const base64Data = await blobToBase64(videoBlob);

    const languageInstruction = language === 'auto' 
      ? "Detecta o idioma automaticamente (probablemente Español ou Galego)." 
      : `O idioma falado é: ${language}.`;

    // Using gemini-3-pro-preview for advanced reasoning on visual data
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'video/webm', // Using webm as likely output from MediaRecorder
              data: base64Data,
            },
          },
          {
            text: `Actúa como un experto lector de labios forense. 
            
            Recortei este vídeo para centrarme exclusivamente na zona da boca do falante. 
            A túa tarefa é transcribir o que se está a dicir baseándote nos movementos visuais dos labios.
            ${languageInstruction}
            
            Instrucións:
            1. Ignora calquera pista de audio se existe (o enfoque é visual).
            2. Transcribe a frase exacta.
            3. Se hai ambigüidade, proporciona a interpretación máis probable.
            4. Devolve SÓ a transcrición do texto, sen introducións nin explicacións extra.`
          },
        ],
      },
      config: {
        temperature: 0.2, // Lower temperature for more precise/deterministic output
      },
    });

    return response.text || "Non se puido xerar unha transcrición.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw error;
  }
};