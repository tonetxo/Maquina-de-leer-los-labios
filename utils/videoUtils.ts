import { CropArea } from '../types';

/**
 * Records a cropped portion of a video element to a Blob with High Fidelity settings.
 * Uses dynamic upscaling (smart limit) and requestVideoFrameCallback for precise frame capture.
 * Includes safeguards against hanging (watchdogs).
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

    // 1. Setup Dynamic High-Res Canvas
    // Mobile browsers crash if canvas > ~4096px or total area is too huge.
    // We limit the max dimension to 1920px (Full HD) which is plenty for lip reading.
    const MAX_DIMENSION = 1920;
    let scaleFactor = 4; // Default target

    if (crop.width * scaleFactor > MAX_DIMENSION) {
      scaleFactor = MAX_DIMENSION / crop.width;
    }
    if (crop.height * scaleFactor > MAX_DIMENSION) {
      const hScale = MAX_DIMENSION / crop.height;
      if (hScale < scaleFactor) scaleFactor = hScale;
    }

    // Ensure minimum scale of 1
    scaleFactor = Math.max(1, scaleFactor);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true 
    });

    if (!ctx) {
      reject(new Error("Could not get canvas context - Memory limit exceeded?"));
      return;
    }

    canvas.width = Math.floor(crop.width * scaleFactor);
    canvas.height = Math.floor(crop.height * scaleFactor);
    
    // High quality smoothing for upscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    console.log(`Processing Crop: ${crop.width}x${crop.height} -> Scaled to ${canvas.width}x${canvas.height} (Factor: ${scaleFactor.toFixed(2)}x)`);

    // 2. Prepare MediaRecorder
    const stream = canvas.captureStream(30); // Request 30fps stream
    const chunks: BlobPart[] = [];
    
    // Detect supported mime type
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4'; // Safari preference
    } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
      mimeType = 'video/webm; codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
      mimeType = 'video/webm; codecs=vp8';
    }

    let recorder: MediaRecorder;
    try {
      // 8 Mbps is high quality
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000 
      });
    } catch (e) {
      try {
        // Fallback without bitrate if specific options fail
        recorder = new MediaRecorder(stream);
      } catch (err) {
        reject(new Error(`MediaRecorder failed to initialize: ${(err as Error).message}`));
        return;
      }
    }

    // SAFETY 1: Watchdog Timer
    // If recording takes significantly longer than the clip duration + buffer, kill it.
    const durationSec = endTime - startTime;
    const expectedDurationMs = durationSec * 1000;
    const safetyTimeoutId = setTimeout(() => {
      console.warn("Video processing timed out (Watchdog). Forcing stop.");
      forceStop("Timeout exceeded");
    }, expectedDurationMs + 5000); // 5 seconds buffer

    let isFinished = false;

    const cleanup = () => {
      clearTimeout(safetyTimeoutId);
      isFinished = true;
      // Restore UI state if needed, though caller handles logic
      // setTimeout to avoid audio glitch
      setTimeout(() => { 
        try { sourceVideo.muted = originalMuted; } catch(e){} 
      }, 100);
    };

    const forceStop = (reason: string) => {
      if (isFinished) return;
      console.warn(`Force stopping: ${reason}`);
      cleanup();
      if (recorder.state === 'recording') {
        recorder.stop();
      } else {
        // If we never started or already stopped
        reject(new Error(reason));
      }
    };

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      if (!isFinished) cleanup(); // Ensure cleanup if natural stop
      const blob = new Blob(chunks, { type: mimeType });
      console.log(`Video processed: ${blob.size} bytes, MIME: ${mimeType}`);
      if (blob.size === 0) {
        reject(new Error("Recording failed: Output file is empty"));
      } else {
        resolve(blob);
      }
    };

    recorder.onerror = (e) => {
      cleanup();
      reject(new Error("Recorder error: " + (e as any).error?.message));
    };

    // 3. Frame Capture Logic using requestVideoFrameCallback for precision
    const processFrames = async () => {
      try {
        // SAFETY 2: Seek Timeout
        // Don't wait forever for 'seeked' event
        await new Promise<void>((res) => {
          let isResolved = false;
          
          const onSeeked = () => {
            if (isResolved) return;
            isResolved = true;
            res();
          };

          sourceVideo.currentTime = startTime;
          
          // If already at time (approx), resolve immediately
          if (Math.abs(sourceVideo.currentTime - startTime) < 0.1) {
             isResolved = true;
             res();
             return;
          }

          sourceVideo.addEventListener('seeked', onSeeked, { once: true });

          // Force proceed after 2s if browser doesn't fire seeked
          setTimeout(() => {
            if (!isResolved) {
              console.warn("Seek event timeout. Proceeding anyway.");
              isResolved = true;
              sourceVideo.removeEventListener('seeked', onSeeked);
              res();
            }
          }, 2000);
        });

        if (recorder.state === 'inactive') {
            recorder.start();
        }
        
        // Helper to draw
        const draw = () => {
          ctx.drawImage(
            sourceVideo, 
            crop.x, crop.y, crop.width, crop.height, 
            0, 0, canvas.width, canvas.height
          );
        };

        // Define the loop
        const videoEl = sourceVideo as any;
        
        const onFrame = (now: number, metadata: any) => {
          if (isFinished) return;

          // SAFETY 3: Check if paused unexpectedly or ended
          if (sourceVideo.paused && sourceVideo.currentTime > startTime + 0.1) {
             // It paused mid-way?
             console.warn("Video paused unexpectedly");
             if (recorder.state === 'recording') recorder.stop();
             return;
          }
          
          if (sourceVideo.ended) {
             if (recorder.state === 'recording') recorder.stop();
             return;
          }

          draw();

          if (sourceVideo.currentTime < endTime) {
            videoEl.requestVideoFrameCallback(onFrame);
          } else {
            sourceVideo.pause();
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }
        };

        // Start playback and loop
        await sourceVideo.play();
        draw(); // Initial draw
        
        if (typeof videoEl.requestVideoFrameCallback === 'function') {
           videoEl.requestVideoFrameCallback(onFrame);
        } else {
           // Fallback for browsers without rVFC
           console.warn("requestVideoFrameCallback not supported, using fallback");
           const fallbackLoop = () => {
             if (isFinished) return;
             if (sourceVideo.paused || sourceVideo.ended) {
                if (recorder.state === 'recording') recorder.stop();
                return;
             }
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
        console.error("Recording loop failed", e);
        cleanup();
        reject(e);
      }
    };

    // Mute for processing
    const originalMuted = sourceVideo.muted;
    sourceVideo.muted = true;

    processFrames();
  });
};