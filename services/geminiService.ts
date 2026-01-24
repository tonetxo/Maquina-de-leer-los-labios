import { GoogleGenAI, Modality } from '@google/genai';
import { AI_MODELS, PRESERVE_LANGUAGES } from '../constants/app';

// Validación más robusta de la API key
const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY || typeof API_KEY !== 'string' || API_KEY.trim() === '') {
    console.error("VITE_API_KEY environment variable not set or invalid");
    throw new Error("VITE_API_KEY environment variable not set or invalid");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const visionModel = AI_MODELS.VISION_MODEL;
const ttsModel = AI_MODELS.TTS_MODEL;

/**
 * Prompt base para la lectura de labios con IA
 * Este prompt le indica al modelo Gemini cómo interpretar los movimientos labiales
 */
const LIP_READING_PROMPT_BASE = `You are an expert forensic lip-reading AI. Analyze the following sequence of HIGHLY MAGNIFIED, CROPPED video frames showing only a person's mouth. The frames are in chronological order, captured at 25 FPS, and show subtle movements of lips, teeth, and tongue.

**Task**: Transcribe the exact words being spoken with maximum accuracy. Even small movements matter (e.g., lip closure for "p", tongue position for "l").

**Rules**:
- Output ONLY the transcribed text.
- Do NOT add any commentary, explanations, or prefixes like "The person says:".
- If the audio is unclear or silent, respond with: "Unclear or no speech detected."
- If multiple people appear, focus on the primary speaker's mouth.
- Account for natural speech artifacts: mumbling, pauses, swallowed syllables.

**Context**:
- This is a silent video. All information comes from visual lip movement.
- The speaker may not be facing the camera directly.
- Lighting and resolution are good, but motion blur may occur.

Now, transcribe the spoken phrase from the frame sequence:`;

/**
 * Transcribe un vídeo a partir de sus frames
 * @param frames Array de frames codificados en base64
 * @param language Idioma de la transcripción
 * @param fps Frames por segundo del vídeo original
 * @returns Texto transcrito
 */
export async function transcribeVideoFromFrames(frames: string[], language: string, fps: number): Promise<string> {
    // Convertir los frames a formato compatible con la API
    const imageParts = frames.map(frame => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: frame,
        },
    }));

    // Personalizar el prompt con el framerate real
    let finalPrompt = LIP_READING_PROMPT_BASE.replace('at 25 FPS', `at approximately ${Math.round(fps)} FPS`);

    if (language && language !== 'auto') {
        // Si se especifica un idioma, añadirlo al prompt
        finalPrompt += ` The person is speaking ${language}.`;

        // Si el idioma no está en la lista de preservados, añadir traducción al español
        if (!PRESERVE_LANGUAGES.includes(language as (typeof PRESERVE_LANGUAGES)[number])) {
            finalPrompt += " Output the original transcription first. Then, add a newline and provide the Spanish translation labeled as 'Translation (Spanish): '.";
        }
    } else {
        // Si no se especifica idioma, detectarlo y traducir si es necesario
        finalPrompt += " Detect the language. If the spoken language is NOT Spanish, Galician, or English, output the original transcription, followed by a newline and the Spanish translation labeled as 'Translation (Spanish): '. Otherwise, output ONLY the original transcription.";
    }

    // Realizar la solicitud al modelo de IA
    const response = await ai.models.generateContent({
        model: visionModel,
        contents: {
            parts: [
                { text: finalPrompt },
                ...imageParts,
            ],
        },
    });

    return response.text || '';
}

export async function generateSpeech(text: string): Promise<string> {
    const prompt = `Say: ${text}`;
    
    const response = await ai.models.generateContent({
        model: ttsModel,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' },
                },
            },
        },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
        throw new Error('No audio data returned from API.');
    }

    return audioData;
}