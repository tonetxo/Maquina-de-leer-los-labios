import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TimeRange } from '../types';
import { PlayIcon, StopIcon } from './Icons';
import { formatTime as formatTimeUtil } from '../utils/formatTime';

type TimeSelectorProps = {
    videoUrl: string;
    duration: number;
    onConfirm: (range: TimeRange) => void;
    onCancel: () => void;
};

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const TimeSelector: React.FC<TimeSelectorProps> = ({ videoUrl, duration, onConfirm, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState<TimeRange>({ start: 0, end: duration });
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const dragInfo = useRef<{ active: boolean; type: 'start' | 'end'; startX: number; startRange: TimeRange } | null>(null);

    useEffect(() => {
        setRange({ start: 0, end: duration });
    }, [duration]);

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
        const newTimeDelta = (dx / timelineRect.width) * duration;
        
        let newRange = { ...dragInfo.current.startRange };
        if (dragInfo.current.type === 'start') {
            newRange.start = Math.max(0, Math.min(newRange.end, dragInfo.current.startRange.start + newTimeDelta));
        } else {
            newRange.end = Math.min(duration, Math.max(newRange.start, dragInfo.current.startRange.end + newTimeDelta));
        }
        
        setRange(newRange);
        videoRef.current.currentTime = dragInfo.current.type === 'start' ? newRange.start : newRange.end;
        
    }, [duration]);

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
    }, [handleMouseMove, handleMouseUp]);

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
                    <div className="text-sm font-mono">
                        <span>{formatTimeUtil(currentTime)}</span> / <span>{formatTime(duration)}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onCancel} className="py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
                        <button onClick={() => onConfirm(range)} className="py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">Confirm Time</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeSelector;
