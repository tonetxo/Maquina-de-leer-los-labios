import { CropArea } from '../types';

/**
 * Records a cropped portion of a video element to a Blob with High Fidelity settings.
 * Uses 4x upscaling and requestVideoFrameCallback for precise frame capture.
 */
export const recordCroppedVideo = (
  sourceVideo: HTMLVideoElement,
  crop: CropArea,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (crop.width <= 0 || crop.height <= 0) {
      reject(new Error("Invalid crop dimensions"));
      return;
    }

    // 1. Setup High-Res Canvas (4x Upscaling)
    const UPSCALE_FACTOR = 4;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true 
    });

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    canvas.width = crop.width * UPSCALE_FACTOR;
    canvas.height = crop.height * UPSCALE_FACTOR;
    
    // High quality smoothing for upscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 2. Prepare MediaRecorder
    const stream = canvas.captureStream(30); // Request 30fps stream
    const chunks: BlobPart[] = [];
    
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
      mimeType = 'video/webm; codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
      mimeType = 'video/webm; codecs=vp8';
    }

    let recorder: MediaRecorder;
    try {
      // High bitrate (8 Mbps) for clarity
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000 
      });
    } catch (e) {
      try {
        recorder = new MediaRecorder(stream);
      } catch (err) {
        reject(err);
        return;
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      console.log(`Video processed: ${blob.size} bytes, MIME: ${mimeType}`);
      resolve(blob);
    };

    // 3. Frame Capture Logic using requestVideoFrameCallback for precision
    const processFrames = async () => {
      // Wait for seek to complete
      await new Promise<void>((res) => {
        const onSeeked = () => {
          sourceVideo.removeEventListener('seeked', onSeeked);
          res();
        };
        sourceVideo.currentTime = startTime;
        sourceVideo.addEventListener('seeked', onSeeked, { once: true });
      });

      recorder.start();
      
      // Helper to draw
      const draw = () => {
        ctx.drawImage(
          sourceVideo, 
          crop.x, crop.y, crop.width, crop.height, 
          0, 0, canvas.width, canvas.height
        );
      };

      // Define the loop
      // We cast to any because requestVideoFrameCallback is not in all TS definitions yet
      const videoEl = sourceVideo as any;
      let handle: number;

      const onFrame = (now: number, metadata: any) => {
        if (sourceVideo.paused || sourceVideo.ended) {
           // If user manually paused or something stopped it
           if (recorder.state === 'recording') recorder.stop();
           return;
        }

        draw();

        if (sourceVideo.currentTime < endTime) {
          handle = videoEl.requestVideoFrameCallback(onFrame);
        } else {
          sourceVideo.pause();
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      };

      // Start playback and loop
      try {
        await sourceVideo.play();
        // Initial draw
        draw();
        
        if (typeof videoEl.requestVideoFrameCallback === 'function') {
           handle = videoEl.requestVideoFrameCallback(onFrame);
        } else {
           // Fallback for browsers without rVFC (like Firefox sometimes or older Safari)
           console.warn("requestVideoFrameCallback not supported, using fallback");
           const fallbackLoop = () => {
             if (sourceVideo.paused || sourceVideo.ended) return;
             draw();
             if (sourceVideo.currentTime < endTime) {
               requestAnimationFrame(fallbackLoop);
             } else {
               sourceVideo.pause();
               if (recorder.state === 'recording') recorder.stop();
             }
           };
           requestAnimationFrame(fallbackLoop);
        }
      } catch (e) {
        console.error("Playback failed", e);
        reject(e);
      }
    };

    // Mute for processing
    const originalMuted = sourceVideo.muted;
    sourceVideo.muted = true;

    processFrames().finally(() => {
      // Restore state is handled somewhat, but mainly we ensure blob resolves
      // We don't unmute immediately to avoid noise blasts if it stopped
      setTimeout(() => { sourceVideo.muted = originalMuted; }, 100);
    });
  });
};