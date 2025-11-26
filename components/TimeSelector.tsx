import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TimeRange } from '../types';
import { PlayIcon, StopIcon } from './Icons';
import { formatTime as formatTimeUtil, formatSeconds } from '../utils/formatTime';

type TimeSelectorProps = {
    videoUrl: string;
    duration: number;
    onConfirm: (range: TimeRange) => void;
    onCancel: () => void;
};

const TimeSelector: React.FC<TimeSelectorProps> = ({ videoUrl, duration, onConfirm, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState<TimeRange>({ start: 0, end: 0 }); // Start with 0 initially
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const dragInfo = useRef<{ active: boolean; type: 'start' | 'end'; startX: number; startRange: TimeRange } | null>(null);
    const rangeRef = useRef<TimeRange>(range);
    const hasInitialized = useRef(false);

    useEffect(() => {
        // Initialize range when component mounts with a valid duration
        if (duration > 0 && !hasInitialized.current) {
            setRange({ start: 0, end: duration });
            hasInitialized.current = true;
        }
    }, [duration]); // Run when duration changes, but only set if not initialized

    useEffect(() => {
        rangeRef.current = range;
    }, [range]);

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        if (isPlaying && time >= range.end) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            if (videoRef.current.currentTime < range.start || videoRef.current.currentTime >= range.end) {
                videoRef.current.currentTime = range.start;
            }
            videoRef.current.play();
            setIsPlaying(true);
        }
    };
    
    const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end') => {
        e.preventDefault();
        dragInfo.current = {
            active: true,
            type,
            startX: e.clientX,
            startRange: range,
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragInfo.current?.active || !timelineRef.current || !videoRef.current) return;

        const timelineRect = timelineRef.current.getBoundingClientRect();
        const dx = e.clientX - dragInfo.current.startX;
        const timeDelta = (dx / timelineRect.width) * duration;

        // Calculate new position for the handle being dragged using functional state update
        if (dragInfo.current.type === 'start') {
            // Only modify the start value when dragging start handle
            setRange(prev => {
                const newStart = dragInfo.current.startRange.start + timeDelta;
                const clampedStart = Math.max(0, Math.min(prev.end, newStart)); // Use previous end as constraint
                return { ...prev, start: clampedStart };
            });
        } else { // 'end' handle
            // Only modify the end value when dragging end handle
            setRange(prev => {
                const newEnd = dragInfo.current.startRange.end + timeDelta;
                const clampedEnd = Math.min(duration, Math.max(prev.start, newEnd)); // Use previous start as constraint
                return { ...prev, end: clampedEnd };
            });
        }

        // Update video playback position to match the handle being dragged
        const newCalculatedTime = dragInfo.current.type === 'start'
            ? Math.max(0, Math.min(rangeRef.current.end, dragInfo.current.startRange.start + timeDelta))
            : Math.min(duration, Math.max(rangeRef.current.start, dragInfo.current.startRange.end + timeDelta));
        videoRef.current.currentTime = newCalculatedTime;

    }, [duration]);  // Removed 'range' from dependencies since we use functional updates

    const handleMouseUp = useCallback(() => {
        dragInfo.current = null;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]); // This is now correct since handleMouseMove doesn't depend on range

    const startPercent = (range.start / duration) * 100;
    const endPercent = (range.end / duration) * 100;

    return (
        <div className="bg-black rounded-lg overflow-hidden relative flex flex-col justify-between h-full">
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-auto object-contain"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            <div className="p-4 space-y-3 bg-gray-900/50">
                <div ref={timelineRef} className="relative w-full h-2 bg-gray-600 rounded cursor-pointer">
                    <div className="absolute top-0 h-full bg-purple-400 rounded" style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}></div>
                    <div className="absolute top-0 h-full w-px bg-white" style={{ left: `${(currentTime / duration) * 100}%` }}></div>

                    {/* Start Handle */}
                    <div
                        className="absolute -top-1.5 w-5 h-5 bg-white rounded-full border-2 border-purple-500 cursor-ew-resize"
                        style={{ left: `${startPercent}%`, transform: 'translateX(-50%)' }}
                        onMouseDown={(e) => handleMouseDown(e, 'start')}
                    />
                    
                    {/* End Handle */}
                    <div
                        className="absolute -top-1.5 w-5 h-5 bg-white rounded-full border-2 border-purple-500 cursor-ew-resize"
                        style={{ left: `${endPercent}%`, transform: 'translateX(-50%)' }}
                        onMouseDown={(e) => handleMouseDown(e, 'end')}
                    />
                </div>
                <div className="flex items-center justify-between text-white">
                     <button onClick={handlePlayPause} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                        {isPlaying ? <StopIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                    
                    <div className="flex flex-col items-start text-sm font-mono leading-tight mx-4">
                        <span>{formatSeconds(range.start)} - {formatSeconds(range.end)}</span>
                        <span className="text-xs text-gray-400">Dur: {formatSeconds(range.end - range.start)}</span>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onCancel} className="py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
                        <button onClick={() => onConfirm(range)} className="py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">Confirmar Tempo</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeSelector;
