import { CropArea, TimeRange } from '../types';
import { VIDEO_PROCESSING_CONSTANTS } from '../constants/app';

const { MAX_FRAMES, FRAME_QUALITY, UPSCALE_WIDTH, UPSCALE_HEIGHT } = VIDEO_PROCESSING_CONSTANTS;

/**
 * Recorta y escala una imagen según el área especificada
 * @param imageSrc URL de origen de la imagen
 * @param crop Área de recorte con coordenadas x, y, ancho y alto
 * @returns Promesa que resuelve con la imagen procesada en formato data URL
 */
export function cropAndUpscaleImage(imageSrc: string, crop: CropArea): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
                return reject(new Error('Could not get canvas context.'));
            }

            // Configurar dimensiones del canvas
            canvas.width = UPSCALE_WIDTH;
            canvas.height = UPSCALE_HEIGHT;

            // Dibujar imagen recortada y escalada
            context.drawImage(
                img,
                crop.x, crop.y, crop.width, crop.height,  // Área de origen (recorte)
                0, 0, UPSCALE_WIDTH, UPSCALE_HEIGHT       // Área de destino (canvas completo)
            );

            // Convertir a data URL JPEG con la calidad configurada
            resolve(canvas.toDataURL('image/jpeg', FRAME_QUALITY));
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for cropping.'));
        };

        img.src = imageSrc;
    });
}


/**
 * Extrae frames de un archivo de video dentro de un rango de tiempo específico
 * @param file Archivo de video a procesar
 * @param onProgress Callback para reportar progreso (0 a 1)
 * @param timeRange Rango de tiempo a procesar (inicio y fin en segundos)
 * @param crop Área de recorte para cada frame
 * @returns Promesa que resuelve con un array de frames codificados en base64
 */
export function extractFramesFromVideo(file: File, onProgress: (progress: number) => void, timeRange: TimeRange, crop: CropArea): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];

    if (!context) {
      return reject(new Error('Could not get canvas context.'));
    }

    // Configurar el video para procesamiento eficiente
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      // Calcular dimensiones de destino manteniendo la proporción del área de recorte
      const cropAspectRatio = crop.width / crop.height;
      let destWidth, destHeight;

      if (cropAspectRatio > 1) { // Más ancho que alto
          destWidth = UPSCALE_WIDTH;
          destHeight = destWidth / cropAspectRatio;
      } else { // Más alto que ancho o cuadrado
          destHeight = UPSCALE_HEIGHT;
          destWidth = destHeight * cropAspectRatio;
      }

      // Establecer dimensiones del canvas
      canvas.width = Math.round(destWidth);
      canvas.height = Math.round(destHeight);

      // Calcular duración y frecuencia de captura de frames
      const duration = timeRange.end - timeRange.start;
      if (duration <= 0) {
        URL.revokeObjectURL(videoUrl);
        return resolve([]);
      }

      // Intervalo entre capturas para distribuir uniformemente los frames
      const interval = duration / MAX_FRAMES;
      let currentTime = timeRange.start;
      let frameCount = 0;

      // Pre-calcular parámetros de recorte para evitar cálculos repetidos
      const cropParams = {
        sx: crop.x,        // Coordenada x de origen en la imagen original
        sy: crop.y,        // Coordenada y de origen en la imagen original
        sWidth: crop.width, // Ancho del área de origen
        sHeight: crop.height, // Alto del área de origen
        dx: 0,             // Coordenada x de destino en el canvas
        dy: 0,             // Coordenada y de destino en el canvas
        dWidth: canvas.width,  // Ancho del área de destino
        dHeight: canvas.height // Alto del área de destino
      };

      /**
       * Función recursiva para capturar frames secuencialmente
       */
      const captureFrame = () => {
        if (currentTime > timeRange.end || frameCount >= MAX_FRAMES) {
          // Limpiar recursos y resolver la promesa
          URL.revokeObjectURL(videoUrl);
          video.src = '';
          onProgress(1); // Marcar como 100% completado
          resolve(frames);
          return;
        }

        // Establecer el tiempo actual del video para capturar el frame
        video.currentTime = currentTime;
      };

      // Evento que se dispara cuando el video ha buscado al tiempo indicado
      video.onseeked = () => {
        // Configurar alta calidad para el suavizado de imágenes
        context.imageSmoothingQuality = 'high';

        // Dibujar el frame recortado en el canvas
        context.drawImage(
          video,
          cropParams.sx, cropParams.sy, cropParams.sWidth, cropParams.sHeight, // Origen (área recortada del video)
          cropParams.dx, cropParams.dy, cropParams.dWidth, cropParams.dHeight  // Destino (canvas)
        );

        // Convertir el frame a formato JPEG y extraer solo los datos base64
        const dataUrl = canvas.toDataURL('image/jpeg', FRAME_QUALITY);
        frames.push(dataUrl.split(',')[1]); // Extraer solo la parte base64

        // Actualizar contadores y progreso
        frameCount++;
        currentTime += interval;
        onProgress(frameCount / MAX_FRAMES);

        // Capturar el siguiente frame
        captureFrame();
      };

      // Manejar errores de carga del video
      video.onerror = (e) => {
          URL.revokeObjectURL(videoUrl);
          video.src = '';
          reject(new Error(`Error loading video file: ${e instanceof Error ? e.message : 'Unknown error'}`));
      };

      // Iniciar el proceso de captura
      captureFrame();
    };
  });
}
