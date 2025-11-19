export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VideoState {
  file: File | null;
  url: string | null;
  duration: number;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  CROPPING = 'CROPPING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface AnalysisResult {
  text: string;
  confidence?: string;
  details?: string;
}