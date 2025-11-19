import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Scissors, Play, Pause, ZoomIn, Crop as CropIcon, BrainCircuit, RefreshCcw, Trash2, AlertCircle, Languages } from 'lucide-react';
import { VideoState, CropArea, ProcessingStatus } from './types';
import { recordCroppedVideo } from './utils/videoUtils';
import { analyzeLipReading } from './services/geminiService';
import { Loader } from './components/Loader';

// Constants
const MAX_VIDEO_DURATION_SEC = 10; // Limit processing to 10 seconds for demo performance

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Autodetectar' },
  { code: 'gl', label: 'Galego' },
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
];

const App: React.FC = () => {
  const [videoState, setVideoState] = useState<VideoState>({ file: null, url: null, duration: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Trimming state
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Cropping state
  const [isCropping, setIsCropping] = useState(true);
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Settings state
  const [selectedLanguage, setSelectedLanguage] = useState('auto');

  // Processing state
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [resultText, setResultText] = useState<string>("");

  // UI State
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Ref to track status synchronously to avoid race conditions in loops
  const statusRef = useRef<ProcessingStatus>(ProcessingStatus.IDLE);

  // Refs for dragging logic
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startCropRef = useRef<CropArea>({ x: 0, y: 0, width: 0, height: 0 });

  // Sync status ref
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Handle file upload
  const handleFile = (file: File) => {
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoState({ file, url, duration: 0 });
      setStatus(ProcessingStatus.IDLE);
      setResultText("");
    } else {
      alert("Por favor sube un arquivo de vídeo válido.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const v = videoRef.current;
      setVideoState(prev => ({ ...prev, duration: v.duration }));
      setEndTime(Math.min(v.duration, 5)); // Default to 5 seconds or max
      setVideoDimensions({ width: v.videoWidth, height: v.videoHeight });
      
      // Initial crop: centered 40% box
      const initialSize = Math.min(v.videoWidth, v.videoHeight) * 0.4;
      setCrop({
        x: (v.videoWidth - initialSize) / 2,
        y: (v.videoHeight - initialSize) / 2,
        width: initialSize,
        height: initialSize
      });
    }
  };

  // Sync time with video
  const handleTimeUpdate = () => {
    // IMPORTANT: When processing (recording), disable the playback loop logic
    // to prevent fighting with the recorder's control of the video element.
    if (statusRef.current !== ProcessingStatus.IDLE) return;

    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Loop within trim selection
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
        if (!isPlaying) videoRef.current.pause(); 
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (videoRef.current.currentTime >= endTime) {
            videoRef.current.currentTime = startTime;
        }
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // --- Cropping Interaction Logic ---
  
  // Convert visual coordinates (screen pixels) to video coordinates (actual video resolution)
  const getScaleFactors = () => {
    if (!videoRef.current) return { x: 1, y: 1 };
    const rect = videoRef.current.getBoundingClientRect();
    // Prevent division by zero
    if (rect.width === 0 || rect.height === 0) return { x: 1, y: 1 };
    
    return {
      x: videoRef.current.videoWidth / rect.width,
      y: videoRef.current.videoHeight / rect.height
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCropping) return;
    e.preventDefault(); // Prevent text selection/dragging image ghost
    isDraggingRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startCropRef.current = { ...crop };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !isCropping || !videoRef.current) return;

    const scale = getScaleFactors();
    const dx = (e.clientX - startPosRef.current.x) * scale.x;
    const dy = (e.clientY - startPosRef.current.y) * scale.y;

    let newX = startCropRef.current.x + dx;
    let newY = startCropRef.current.y + dy;

    // Boundaries
    newX = Math.max(0, Math.min(newX, videoDimensions.width - crop.width));
    newY = Math.max(0, Math.min(newY, videoDimensions.height - crop.height));

    setCrop(prev => ({ ...prev, x: newX, y: newY }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleResizeCrop = (deltaSize: number) => {
    setCrop(prev => {
      const newSize = Math.max(50, Math.min(prev.width + deltaSize, videoDimensions.width, videoDimensions.height));
      return {
        ...prev,
        width: newSize,
        height: newSize
      };
    });
  };

  // --- Processing Logic ---

  const processAndAnalyze = async () => {
    if (!videoRef.current) return;

    // Validation
    if (endTime - startTime > MAX_VIDEO_DURATION_SEC) {
      alert(`Por favor selecciona un clip menor a ${MAX_VIDEO_DURATION_SEC} segundos para un rendemento óptimo.`);
      return;
    }

    if (crop.width <= 0 || crop.height <= 0) {
      alert("A área de recorte non é válida.");
      return;
    }

    try {
      setIsPlaying(false); // Force pause UI state
      setStatus(ProcessingStatus.CROPPING);
      statusRef.current = ProcessingStatus.CROPPING;
      
      // 1. Crop and Record
      const croppedBlob = await recordCroppedVideo(
        videoRef.current,
        crop,
        startTime,
        endTime
      );

      setStatus(ProcessingStatus.ANALYZING);
      statusRef.current = ProcessingStatus.ANALYZING;

      // 2. Send to Gemini
      const text = await analyzeLipReading(croppedBlob, selectedLanguage);
      
      setResultText(text);
      setStatus(ProcessingStatus.COMPLETED);
      statusRef.current = ProcessingStatus.COMPLETED;

    } catch (error) {
      console.error("Error processing video:", error);
      setStatus(ProcessingStatus.ERROR);
      statusRef.current = ProcessingStatus.ERROR;
    }
  };

  const reset = () => {
    setVideoState({ file: null, url: null, duration: 0 });
    setResultText("");
    setStatus(ProcessingStatus.IDLE);
    statusRef.current = ProcessingStatus.IDLE;
    setIsPlaying(false);
  };

  // Render crop overlay based on current video display size
  const renderCropOverlay = () => {
    if (!videoRef.current || !isCropping) return null;
    
    const rect = videoRef.current.getBoundingClientRect();
    if (rect.width === 0 || videoDimensions.width === 0) return null;

    const scaleX = rect.width / videoDimensions.width;
    const scaleY = rect.height / videoDimensions.height;

    const style = {
      left: `${crop.x * scaleX}px`,
      top: `${crop.y * scaleY}px`,
      width: `${crop.width * scaleX}px`,
      height: `${crop.height * scaleY}px`,
    };

    return (
      <div 
        className="absolute border-2 border-brand-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move group z-10"
        style={style}
        onMouseDown={handleMouseDown}
      >
        {/* Crosshair center */}
        <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50">
           <div className="absolute w-full h-0.5 bg-brand-500 top-1/2 -translate-y-1/2"></div>
           <div className="absolute h-full w-0.5 bg-brand-500 left-1/2 -translate-x-1/2"></div>
        </div>
        
        {/* Corner markers */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-brand-200"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-brand-200"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-brand-200"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-brand-200"></div>
        
        <div className="absolute -top-8 left-0 bg-brand-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Arrastra para mover
        </div>
      </div>
    );
  };

  // --- View: Upload ---
  if (!videoState.url) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="relative z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-400 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
            <BrainCircuit size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">LipRead AI</h1>
          <p className="text-slate-400 mb-8">
            Sube un vídeo, encadra os labios e deixa que a IA transcriba o que se di.
          </p>
          
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 
              ${isDraggingFile ? 'border-brand-500 bg-brand-500/10 scale-105' : 'border-slate-600 hover:border-brand-500 hover:bg-brand-500/5'}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className={`w-8 h-8 mb-3 transition-colors ${isDraggingFile ? 'text-brand-400' : 'text-slate-500 group-hover:text-brand-400'}`} />
              <p className="text-sm text-slate-400 group-hover:text-brand-200"><span className="font-semibold">Fai clic para subir</span> ou arrastra</p>
              <p className="text-xs text-slate-600 mt-1">MP4, WebM, MOV</p>
            </div>
            <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
          </label>
        </div>
        
        {/* Footer permissions hint */}
        <div className="absolute bottom-4 text-slate-600 text-xs">
          Impulsado por Gemini 3.0 Pro
        </div>
      </div>
    );
  }

  // --- View: Editor / Results ---
  return (
    <div className="h-full w-full flex flex-col bg-slate-950 overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 z-20">
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-brand-500" />
          <span className="font-bold text-lg text-slate-100 hidden sm:inline">LipRead AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={reset} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Trash2 size={16} /> <span className="hidden sm:inline">Cancelar</span>
          </button>
          <button 
            onClick={processAndAnalyze}
            disabled={status !== ProcessingStatus.IDLE}
            className={`flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-brand-900/50 ${status !== ProcessingStatus.IDLE ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
             {status === ProcessingStatus.IDLE ? (
               <>
                 <RefreshCcw size={18} /> <span className="hidden sm:inline">Analizar</span>
               </>
             ) : (
               'Procesando...'
             )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left: Video Area */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden p-4 select-none">
           
           {/* Container for video + overlay. 
               IMPORTANT: 'inline-block' ensures the container shrinks to fit the video content width.
               Removing 'aspect-video' allows vertical videos to display correctly without pillarboxing offsets. 
           */}
           <div ref={containerRef} className="relative shadow-2xl inline-block max-h-full max-w-full">
             {/* Removed crossOrigin="anonymous" to reduce issues with local blobs in some browsers */}
             <video
               ref={videoRef}
               src={videoState.url || ""}
               onLoadedMetadata={handleLoadedMetadata}
               onTimeUpdate={handleTimeUpdate}
               className="max-h-[calc(100vh-14rem)] max-w-full block object-contain mx-auto"
               playsInline
               onDragStart={(e) => e.preventDefault()} // Prevent native video dragging
             />
             
             {/* Crop Overlay */}
             {renderCropOverlay()}
           </div>

           {/* Overlay Controls (Zoom/Crop size) */}
           <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-slate-900/80 backdrop-blur p-2 rounded-lg border border-slate-700 z-20">
             <button onClick={() => handleResizeCrop(20)} className="p-2 hover:bg-slate-700 rounded text-brand-400" title="Aumentar selección"><ZoomIn size={20} /></button>
             <button onClick={() => handleResizeCrop(-20)} className="p-2 hover:bg-slate-700 rounded text-slate-400" title="Diminuír selección"><CropIcon size={20} /></button>
           </div>
        </div>

        {/* Right: Controls & Results Panel */}
        <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shadow-xl z-30 shrink-0 max-h-[40vh] lg:max-h-full">
          
          {/* Timeline / Trimming */}
          <div className="p-6 border-b border-slate-800 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Scissors size={16} /> Seleccionar Momento
              </h3>
              <span className="text-xs font-mono text-brand-400 bg-brand-900/30 px-2 py-1 rounded">
                {(endTime - startTime).toFixed(1)}s
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center text-white transition-colors shrink-0"
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1"/>}
              </button>
              <div className="flex-1 text-xs text-slate-500">
                {currentTime.toFixed(1)}s / {videoState.duration.toFixed(1)}s
              </div>
            </div>

            {/* Range Inputs */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Inicio</span>
                  <span>{startTime.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={videoState.duration}
                  step={0.1}
                  value={startTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val < endTime) {
                       setStartTime(val);
                       videoRef.current!.currentTime = val;
                    }
                  }}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
              <div className="space-y-1">
                 <div className="flex justify-between text-xs text-slate-500">
                  <span>Fin</span>
                  <span>{endTime.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={videoState.duration}
                  step={0.1}
                  value={endTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val > startTime) setEndTime(val);
                  }}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
            </div>
          </div>
          
          {/* Language Selector */}
          <div className="p-6 border-b border-slate-800 shrink-0">
             <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
               <Languages size={16} /> Idioma do audio
             </h3>
             <select 
               value={selectedLanguage} 
               onChange={(e) => setSelectedLanguage(e.target.value)}
               className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 outline-none"
             >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
             </select>
          </div>

          {/* Instructions / Help */}
          <div className="p-6 bg-slate-800/50 border-b border-slate-800 shrink-0 hidden sm:block">
             <div className="flex gap-3 items-start">
               <AlertCircle size={16} className="text-brand-500 mt-0.5 shrink-0" />
               <p className="text-xs text-slate-400 leading-relaxed">
                 1. Axusta o <strong>inicio e fin</strong> para illar a frase. <br/>
                 2. Arrastra o <strong>cadro azul</strong> sobre a boca. <br/>
                 3. Pulsa <strong>Analizar</strong>.
               </p>
             </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 p-6 flex flex-col overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 shrink-0">Transcrición</h3>
            
            {status === ProcessingStatus.CROPPING && (
               <Loader text="Mellorando vídeo e recorte (Upscaling)..." />
            )}
            {status === ProcessingStatus.ANALYZING && (
               <Loader text="Lendo labios (IA)..." />
            )}
            
            {status === ProcessingStatus.COMPLETED && (
              <div className="bg-slate-800/80 border border-brand-500/30 p-5 rounded-xl animate-in slide-in-from-bottom-4 duration-500">
                <p className="text-white text-lg leading-relaxed font-medium">
                  "{resultText}"
                </p>
                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Gemini 3.0 Pro</span>
                  <span className="text-xs text-brand-400">Completado</span>
                </div>
              </div>
            )}

            {status === ProcessingStatus.ERROR && (
               <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-400 text-sm">
                  Ocorreu un erro durante o proceso. Asegúrate de que o vídeo sexa válido e a API Key estea configurada.
               </div>
            )}
            
            {status === ProcessingStatus.IDLE && resultText === "" && (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic">
                Os resultados aparecerán aquí...
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;