export type Status = {
  stage: 'idle' | 'processing' | 'analyzing' | 'success' | 'error' | 'generating_audio';
  message: string;
  progress?: number;
};