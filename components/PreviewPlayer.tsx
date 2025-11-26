import React, { useState, useRef, useEffect } from 'react';
import { CropArea, TimeRange } from '../types';
import { PlayIcon, StopIcon } from './Icons';
import { formatTime } from '../utils/formatTime';

type PreviewPlayerProps = {
    videoUrl: string;
    timeRange: TimeRange;
    cropArea: CropArea;
};

const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ videoUrl, timeRange, cropArea }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null); 
    const [videoStyle, setVideoStyle] = useState<React.CSSProperties>({});
    const [currentTime, setCurrentTime] = useState(timeRange.start);
    const [isPlaying, setIsPlaying] = useState(false);
    
    useEffect(() => {
        if(videoRef.current) {
            videoRef.current.currentTime = timeRange.start;
        }
    }, [timeRange.start, videoUrl]);

    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;

        if (!video || !container || !cropArea || cropArea.width === 0) {
            setVideoStyle({});
            return;
        }

        const updateStyle = () => {
            const { videoWidth, videoHeight } = video;
            const { clientWidth: containerWidth } = container;
            
            if (videoWidth === 0 || containerWidth === 0) return;

            const scale = containerWidth / cropArea.width;
            const translateX = -cropArea.x * scale;
            const translateY = -cropArea.y * scale;

            setVideoStyle({
                width: videoWidth,
                height: videoHeight,
                maxWidth: 'none',
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                transformOrigin: 'top left',
            });
        };

        video.addEventListener('loadedmetadata', updateStyle);
        window.addEventListener('resize', updateStyle);
        
        updateStyle();

        return () => {
            video.removeEventListener('loadedmetadata', updateStyle);
            window.removeEventListener('resize', updateStyle);
        };
    }, [cropArea, videoUrl]);

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        if (isPlaying && time >= timeRange.end) {
            videoRef.current.pause();
            videoRef.current.currentTime = timeRange.start;
            setIsPlaying(false);
        }
    };
    
    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            if (videoRef.current.currentTime < timeRange.start || videoRef.current.currentTime >= timeRange.end) {
                videoRef.current.currentTime = timeRange.start;
            }
            videoRef.current.play();
        }
    };

    const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        videoRef.current.currentTime = newTime;
    };

    return (
        <div className="flex flex-col h-full">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Crop Preview
            </p>
            <div className="bg-black rounded-lg overflow-hidden relative flex flex-col flex-grow">
                <div className="relative w-full flex-grow flex items-center justify-center">
                    <div ref={containerRef} className="relative w-full max-w-full aspect-video overflow-hidden bg-black">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            style={videoStyle}
                            className="absolute top-0 left-0"
                            onTimeUpdate={handleTimeUpdate}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            muted
                            loop
                        />
                    </div>
                </div>
                <div className="p-3 bg-gray-900/50 space-y-2">
                    <div className="flex items-center gap-3">
                        <button onClick={handlePlayPause} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                            {isPlaying ? <StopIcon className="w-4 h-4 text-white" /> : <PlayIcon className="w-4 h-4 text-white" />}
                        </button>
                        <span className="text-xs font-mono text-white">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min={timeRange.start}
                            max={timeRange.end}
                            step="0.01"
                            value={currentTime}
                            onChange={handleScrubberChange}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-purple-500"
                        />
                         <span className="text-xs font-mono text-white">{formatTime(timeRange.end)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreviewPlayer;