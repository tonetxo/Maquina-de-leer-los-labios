import React, { useState, useRef, useEffect } from 'react';
import { transcribeVideoFromFrames, generateSpeech } from './services/geminiService';
import { fetchOllamaModels, transcribeWithOllama, OllamaModel } from './services/ollamaService';
import { extractFramesFromVideo } from './utils/media';
import { decodeBase64, decodeAudioData } from './utils/audio';
import { CropArea, TimeRange, Status, Stage } from './types';
import { ResetIcon } from './components/Icons';
import TimeSelector from './components/TimeSelector';
import Cropper from './components/Cropper';
import PreviewPlayer from './components/PreviewPlayer';
import UploadScreen from './components/UploadScreen';
import ControlsAndResults from './components/ControlsAndResults';
import DebugViewer from './components/DebugViewer';
import { STATUS_MESSAGES } from './constants/app';

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [transcription, setTranscription] = useState<string>('');
  const [status, setStatus] = useState<Status>({ stage: 'idle', message: 'Upload a video to begin' });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage>('uploading');
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>({ start: 0, end: 0 });
  const [language, setLanguage] = useState<string>('auto');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [debugFrames, setDebugFrames] = useState<string[] | null>(null);
  
  // New AI Provider State
  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini');
  const [availableOllamaModels, setAvailableOllamaModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadOllama = async () => {
      const models = await fetchOllamaModels();
      setAvailableOllamaModels(models);
      if (models.length > 0) {
        // Find a good default like llava if available
        const defaultModel = models.find(m => m.name.includes('llava')) || models[0];
        setSelectedModel(defaultModel.name);
      }
    };
    loadOllama();
  }, []);

  const resetState = () => {
    cleanupAudioContext();
    if (provider === 'ollama' && selectedModel) {
      stopOllamaModel(selectedModel);
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setVideoDuration(0);
    setTranscription('');
    setCropArea(null);
    setCurrentStage('uploading');
    setLanguage('auto');
    setDebugFrames(null);
    setStatus({ stage: 'idle', message: STATUS_MESSAGES.IDLE_UPLOAD });
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  const processFile = (file: File | null | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
        setStatus({ stage: 'error', message: STATUS_MESSAGES.INVALID_FILE_TYPE });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        return;
    }

    resetState();
    setVideoFile(file);
    let url: string;

    try {
      url = URL.createObjectURL(file);
    } catch (error) {
      setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_VIDEO_PROCESSING });
      return;
    }

    setVideoUrl(url);

    const video = document.createElement('video');
    video.src = url;
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      setTimeRange({ start: 0, end: video.duration });
      setCurrentStage('selecting_time');
      setStatus({ stage: 'idle', message: STATUS_MESSAGES.STEP_1_SELECT_TIME });
    };
    video.onerror = () => {
      setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_LOADING_METADATA });
      setCurrentStage('uploading');
    };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    processFile(file);
  };
  
  const isProcessing = status.stage === 'processing' || status.stage === 'analyzing';

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleTimeSelectConfirm = async (range: TimeRange) => {
    setTimeRange(range);
    setCurrentStage('cropping_area');
    setStatus({ stage: 'idle', message: STATUS_MESSAGES.STEP_2_DEFINE_CROP });
  };

  const handleCropConfirm = async (crop: CropArea) => {
    setCropArea(crop);
    setCurrentStage('preview');
    setStatus({ stage: 'idle', message: 'Área de recorte establecida. Listo para transcribir.' });
  };

  const getProcessedFrames = async (taskName: string) => {
    if (!videoFile || !cropArea || !timeRange) {
      setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_MISSING_REQUIREMENTS });
      throw new Error('Missing requirements');
    }

    setStatus({ stage: 'processing', message: STATUS_MESSAGES.PROCESSING_FRAMES(taskName), progress: 0 });
    
    return extractFramesFromVideo(
        videoFile, 
        (p) => setStatus({ stage: 'processing', message: `Extraendo fotogramas... ${Math.round(p * 100)}%`, progress: p }), 
        timeRange,
        cropArea
      );
  };

  const handleTranscribe = async () => {
    try {
      setCurrentStage('processing');
      const frames = await getProcessedFrames('transcription');

      if (!frames || frames.length === 0) {
        setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_NO_FRAMES_EXTRACTED });
        return;
      }

      setStatus({ stage: 'analyzing', message: STATUS_MESSAGES.ANALYZING_LIPS });
      const duration = timeRange.end - timeRange.start;
      const effectiveFps = 90 / duration;

      if (duration <= 0) {
        setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_INVALID_TIME_RANGE });
        return;
      }

      let result: string;
      if (provider === 'gemini') {
        result = await transcribeVideoFromFrames(frames, language, effectiveFps);
      } else {
        if (!selectedModel) throw new Error('No Ollama model selected');
        result = await transcribeWithOllama(selectedModel, frames, language, effectiveFps);
      }
      
      setTranscription(result);
      setStatus({ stage: 'success', message: STATUS_MESSAGES.TRANSCRIPTION_COMPLETE });
    } catch (error) {
      console.error('Transcription failed:', error);
      if (error instanceof Error && error.message !== 'Missing requirements') {
          setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_TRANSCRIPTION_FAILED(error instanceof Error ? error.message : STATUS_MESSAGES.ERROR_UNKNOWN) });
      }
    }
  };

  const handleDebug = async () => {
    try {
      const frames = await getProcessedFrames('debug');
      setDebugFrames(frames);
      setCurrentStage('debugging');
      setStatus({ stage: 'idle', message: 'Fotogramas de depuración extraídos.' });
    } catch (error) {
      console.error('Debug failed:', error);
      if (error instanceof Error && error.message !== 'Missing requirements') {
          setStatus({ stage: 'error', message: `Ocorreu un erro: ${error.message}` });
      }
    }
  };

  const handlePlayAudio = async () => {
    if (isPlayingAudio) {
      audioSourceRef.current?.stop();
      setIsPlayingAudio(false);
      return;
    }

    if (!transcription) return;
    setStatus({ stage: 'generating_audio', message: STATUS_MESSAGES.GENERATING_AUDIO });

    try {
      const audioBase64 = await generateSpeech(transcription);
      if (!audioBase64) {
        setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_NO_AUDIO_RECEIVED });
        return;
      }

      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_BROWSER_NO_AUDIO_API });
          return;
        }
        audioContextRef.current = new AudioContextClass({ sampleRate: 32000 });
      }

      const context = audioContextRef.current;

      // Resume context if suspended (needed for some browsers)
      if (context.state === 'suspended') {
        await context.resume();
      }

      const audioBytes = decodeBase64(audioBase64);
      const audioBuffer = await decodeAudioData(audioBytes, context);

      if (!audioBuffer) {
        setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_DECODE_AUDIO });
        return;
      }

      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      source.onended = () => setIsPlayingAudio(false);
      source.start();
      audioSourceRef.current = source;
      setIsPlayingAudio(true);
      setStatus({ stage: 'success', message: STATUS_MESSAGES.PLAYING_AUDIO });
    } catch (error) {
      console.error('Text-to-speech failed:', error);
      setStatus({ stage: 'error', message: STATUS_MESSAGES.ERROR_TTS_FAILED(error instanceof Error ? error.message : STATUS_MESSAGES.ERROR_UNKNOWN) });
    }
  };

  const cleanupAudioContext = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcription);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setStatus({ stage: 'error', message: 'Non se puido copiar ao portapapeis' });
    }
  };
  
  const canTranscribe = videoFile && cropArea && timeRange && !isProcessing && currentStage === 'preview';

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      resetState();
    };
  }, []);
  
  const renderLeftColumn = () => {
    if (currentStage === 'debugging' && debugFrames) {
        return <DebugViewer frames={debugFrames} onClose={() => setCurrentStage('preview')} />
    }

    switch(currentStage) {
      case 'selecting_time':
        return videoUrl && <TimeSelector videoUrl={videoUrl} duration={videoDuration} onConfirm={handleTimeSelectConfirm} onCancel={resetState}/>
      case 'cropping_area':
        return videoUrl && <Cropper videoUrl={videoUrl} timeRange={timeRange} initialCropArea={cropArea} onCropConfirm={handleCropConfirm} onCancel={() => setCurrentStage('selecting_time')} />
      case 'preview':
      case 'processing':
         if (!videoUrl || !cropArea) {
           return (
              <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                  <p className="text-gray-500">Preview not available.</p>
              </div>
           );
         }
         return <PreviewPlayer videoUrl={videoUrl} timeRange={timeRange} cropArea={cropArea} />;
      case 'uploading':
      default:
        return (
            <UploadScreen 
              isDraggingOver={isDraggingOver}
              isProcessing={isProcessing}
              fileInputRef={fileInputRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileChange={handleFileChange}
            />
        )
    }
  }


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            BeizosGal
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Sube un vídeo, selecciona un intervalo de tempo, recorta os beizos e deixa que a IA Gemini transcriba.
          </p>
          {currentStage !== 'uploading' && (
             <button onClick={resetState} className="absolute top-0 right-0 flex items-center gap-2 text-sm py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                <ResetIcon className="w-4 h-4" />
                <span>Comezar de novo</span>
            </button>
          )}
        </header>

        <main className="bg-gray-800 shadow-2xl rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4 min-h-[300px] flex flex-col">
              {renderLeftColumn()}
            </div>

            <ControlsAndResults 
              currentStage={currentStage}
              status={status}
              transcription={transcription}
              isPlayingAudio={isPlayingAudio}
              isProcessing={isProcessing}
              canTranscribe={canTranscribe}
              language={language}
              onLanguageChange={(e) => setLanguage(e.target.value)}
              onSetStage={setCurrentStage}
              onTranscribe={handleTranscribe}
              onPlayAudio={handlePlayAudio}
              onCopy={copyToClipboard}
              onDebug={handleDebug}
              provider={provider}
              onProviderChange={setProvider}
              availableOllamaModels={availableOllamaModels}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </main>
      </div>
    </div>
  );
}