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

export interface OllamaModel {
    name: string;
    model: string;
    details: {
        family: string;
        format: string;
        parameter_size: string;
    };
}

export { Status } from './status';
export { Stage } from './ui';
