import { GoogleGenAI, Modality } from '@google/genai';

if (!import.meta.env.VITE_API_KEY) {
    throw new Error("VITE_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
const visionModel = 'gemini-2.5-pro';
const ttsModel = 'gemini-2.5-flash-preview-tts';

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

export async function transcribeVideoFromFrames(frames: string[], language: string, fps: number): Promise<string> {
    const imageParts = frames.map(frame => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: frame,
        },
    }));

    let finalPrompt = LIP_READING_PROMPT_BASE.replace('at 25 FPS', `at approximately ${Math.round(fps)} FPS`);

    const preserveLanguages = ['Spanish', 'Galician', 'English'];

    if (language && language !== 'auto') {
        finalPrompt += ` The person is speaking ${language}.`;
        if (!preserveLanguages.includes(language)) {
            finalPrompt += " Output the original transcription first. Then, add a newline and provide the Spanish translation labeled as 'Translation (Spanish): '.";
        }
    } else {
        finalPrompt += " Detect the language. If the spoken language is NOT Spanish, Galician, or English, output the original transcription, followed by a newline and the Spanish translation labeled as 'Translation (Spanish): '. Otherwise, output ONLY the original transcription.";
    }

    const response = await ai.models.generateContent({
        model: visionModel,
        contents: {
            parts: [
                { text: finalPrompt },
                ...imageParts,
            ],
        },
    });

    return response.text;
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