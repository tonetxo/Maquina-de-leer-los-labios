export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TimeRange = {
  start: number;
  end: number;
};

export type Status = {
  stage: 'idle' | 'processing' | 'analyzing' | 'success' | 'error' | 'generating_audio';
  message: string;
  progress?: number;
};

export type Stage = 'uploading' | 'selecting_time' | 'cropping_area' | 'preview' | 'processing' | 'debugging';
