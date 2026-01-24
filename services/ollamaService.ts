import { PRESERVE_LANGUAGES } from '../constants/app';

const OLLAMA_BASE_URL = 'http://localhost:11434';

export interface OllamaModel {
    name: string;
    model: string;
    details: {
        family: string;
        format: string;
        parameter_size: string;
    };
}

const LIP_READING_PROMPT_BASE = `You are an expert forensic lip-reading AI. Analyze the following sequence of video frames showing only a person's mouth.

**Task**: Transcribe the exact words being spoken.
**Rules**:
- Output ONLY the transcribed text.
- No commentary or prefixes.
- If unclear, say "Unclear or no speech detected."

Now, transcribe the spoken phrase from the frame sequence:`;

export async function fetchOllamaModels(): Promise<OllamaModel[]> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) throw new Error('Failed to fetch Ollama models');
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error('Error fetching Ollama models:', error);
        return [];
    }
}

export async function transcribeWithOllama(
    model: string,
    frames: string[],
    language: string,
    fps: number
): Promise<string> {
    // Note: Most Ollama vision models work best with a limited number of images.
    // We send a subset or the most relevant ones if the list is too long, 
    // but for now, we try to send the frames extracted.
    
    let finalPrompt = LIP_READING_PROMPT_BASE;
    if (language && language !== 'auto') {
        finalPrompt += ` The person is speaking ${language}.`;
        if (!PRESERVE_LANGUAGES.includes(language as any)) {
            finalPrompt += " Provide the transcription and a Spanish translation.";
        }
    }

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: finalPrompt,
                images: frames, 
                stream: false,
                keep_alive: 0 // Releasing VRAM immediately after request
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ollama transcription failed');
        }

        const data = await response.json();
        return data.response || '';
    } catch (error) {
        console.error('Ollama Error:', error);
        throw error;
    }
}

/**
 * Explicitly unloads a model from VRAM by sending a request with keep_alive: 0
 */
export async function stopOllamaModel(model: string): Promise<void> {
    try {
        await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                keep_alive: 0
            })
        });
        console.log(`Model ${model} unloaded from VRAM`);
    } catch (error) {
        console.error('Error unloading Ollama model:', error);
    }
}
