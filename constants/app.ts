// Constantes para el procesamiento de video
export const VIDEO_PROCESSING_CONSTANTS = {
  MAX_FRAMES: 90,
  FRAME_QUALITY: 0.95,
  UPSCALE_WIDTH: 512,
  UPSCALE_HEIGHT: 512,
} as const;

// Mensajes de estado
export const STATUS_MESSAGES = {
  IDLE_UPLOAD: 'Sube un vídeo para comezar',
  STEP_1_SELECT_TIME: 'Paso 1: Selecciona o intervalo de tempo a analizar.',
  STEP_2_DEFINE_CROP: 'Paso 2: Define a área de recorte nos beizos do falante.',
  PROCESSING_FRAMES: (taskName: string) => `Extraendo fotogramas para ${taskName}...`,
  ANALYZING_LIPS: 'A IA está analizando os movementos dos beizos...',
  TRANSCRIPTION_COMPLETE: 'Transcrición completada!',
  GENERATING_AUDIO: 'Xerando audio...',
  PLAYING_AUDIO: 'Reproducindo audio.',
  DEBUG_FRAMES_EXTRACTED: 'Fotogramas de depuración extraídos.',
  INVALID_FILE_TYPE: 'Tipo de ficheiro non válido. Por favor, sube un vídeo.',
  ERROR_LOADING_METADATA: 'Erro ao cargar os metadatos do vídeo.',
  ERROR_MISSING_REQUIREMENTS: 'Falta o vídeo, a área de recorte ou o intervalo de tempo.',
  ERROR_COPY_TO_CLIPBOARD: 'Non se puido copiar ao portapapeis',
  ERROR_NO_FRAMES_EXTRACTED: 'Non se puideron extraer fotogramas do vídeo.',
  ERROR_INVALID_TIME_RANGE: 'O intervalo de tempo debe ser maior ca cero.',
  ERROR_NO_AUDIO_RECEIVED: 'Non se recibiu audio da API.',
  ERROR_BROWSER_NO_AUDIO_API: 'O navegador non soporta Web Audio API.',
  ERROR_DECODE_AUDIO: 'Erro ao decodificar o audio.',
  ERROR_UNKNOWN: 'Erro descoñecido',
  ERROR_TTS_FAILED: (error: string) => `Non se puido xerar o audio: ${error}`,
  ERROR_TRANSCRIPTION_FAILED: (error: string) => `Ocorreu un erro: ${error}`,
  ERROR_VIDEO_PROCESSING: 'Erro ao procesar o ficheiro de vídeo.',
} as const;

// Modelos de IA
export const AI_MODELS = {
  VISION_MODEL: 'gemini-2.5-pro',
  TTS_MODEL: 'gemini-2.5-flash-preview-tts',
} as const;

// Configuración de audio
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 32000,
} as const;

// Lenguajes
export const LANGUAGES = {
  AUTO_DETECT: 'auto',
  SPANISH: 'Spanish',
  GALICIAN: 'Galician',
  ENGLISH: 'English',
  FRENCH: 'French',
  GERMAN: 'German',
  ITALIAN: 'Italian',
  PORTUGUESE: 'Portuguese',
  MANDARIN_CHINESE: 'Mandarin Chinese',
  JAPANESE: 'Japanese',
  KOREAN: 'Korean',
  RUSSIAN: 'Russian',
  ARABIC: 'Arabic',
  HINDI: 'Hindi',
} as const;

// Lenguajes que no requieren traducción adicional
export const PRESERVE_LANGUAGES = [
  LANGUAGES.SPANISH,
  LANGUAGES.GALICIAN,
  LANGUAGES.ENGLISH,
] as const;