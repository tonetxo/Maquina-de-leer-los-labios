import { CropArea, TimeRange } from '../types';

/**
 * Maximum number of frames to extract to avoid excessive API usage/cost and client-side processing.
 * For optimal lip reading accuracy, keep video clips to ~3 seconds to maximize frame density
 * (at ~30fps, 3 seconds = 90 frames which matches this limit).
 */
const MAX_FRAMES = 90;

/**
 * JPEG quality for extracted frames (0-1).
 * Higher values provide better image quality but larger file sizes.
 */
const FRAME_QUALITY = 0.95;

/**
 * Target dimensions for upscaled cropped images sent to the AI model.
 * The AI model performs better with consistent input sizes.
 */
const UPSCALE_WIDTH = 512;
const UPSCALE_HEIGHT = 512;

export function cropAndUpscaleImage(imageSrc: string, crop: CropArea): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                return reject(new Error('Could not get canvas context.'));
            }
            canvas.width = UPSCALE_WIDTH;
            canvas.height = UPSCALE_HEIGHT;
            context.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, UPSCALE_WIDTH, UPSCALE_HEIGHT);
            resolve(canvas.toDataURL('image/jpeg', FRAME_QUALITY));
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for cropping.'));
        };
        img.src = imageSrc;
    });
}


export function extractFramesFromVideo(file: File, onProgress: (progress: number) => void, timeRange: TimeRange, crop: CropArea): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];

    if (!context) {
      return reject(new Error('Could not get canvas context.'));
    }

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      const cropAspectRatio = crop.width / crop.height;
      let destWidth, destHeight;

      if (cropAspectRatio > 1) { // Wider than tall
          destWidth = UPSCALE_WIDTH;
          destHeight = destWidth / cropAspectRatio;
      } else { // Taller than wide or square
          destHeight = UPSCALE_HEIGHT;
          destWidth = destHeight * cropAspectRatio;
      }

      canvas.width = Math.round(destWidth);
      canvas.height = Math.round(destHeight);

      const duration = timeRange.end - timeRange.start;
      if (duration <= 0) {
        URL.revokeObjectURL(videoUrl);
        return resolve([]);
      }
      const interval = duration / MAX_FRAMES;
      let currentTime = timeRange.start;
      let frameCount = 0;

      const captureFrame = () => {
        if (currentTime > timeRange.end || frameCount >= MAX_FRAMES) {
          URL.revokeObjectURL(videoUrl);
          video.src = '';
          onProgress(1);
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        context.imageSmoothingQuality = 'high';
        context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', FRAME_QUALITY);
        frames.push(dataUrl.split(',')[1]);

        frameCount++;
        currentTime += interval;
        onProgress(frameCount / MAX_FRAMES);
        captureFrame();
      };

      video.onerror = (e) => {
          URL.revokeObjectURL(videoUrl);
          video.src = '';
          reject(new Error('Error loading video file.'));
      };

      // Call captureFrame to start the process
      captureFrame();
    };
  });
}
