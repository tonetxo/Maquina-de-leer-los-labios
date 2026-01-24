import React, { useState, useRef, useCallback } from 'react';
import { TimeRange } from '../types';
import { useVideoControls } from './useVideoControls';

export function useVideoPlayback(timeRange: TimeRange) {
    const { isPlaying, setIsPlaying, currentTime, setCurrentTime, handleTimeUpdate, handlePlayPause, handleScrubberChange } = useVideoControls(timeRange.start);
    const timeRangeRef = useRef(timeRange);

    timeRangeRef.current = timeRange;

    const handleTimeUpdateWithRange = useCallback((video: HTMLVideoElement | null) => {
        if (!video) return;
        const time = video.currentTime;
        
        // Enforce start time boundary (fixes initial 00:00.00 display)
        if (time < timeRangeRef.current.start - 0.1) {
             video.currentTime = timeRangeRef.current.start;
             return;
        }

        // Loop behavior
        if (isPlaying && time >= timeRangeRef.current.end) {
            video.currentTime = timeRangeRef.current.start;
            setCurrentTime(timeRangeRef.current.start);
            // Keep playing
        } else {
            setCurrentTime(time);
        }
    }, [isPlaying, setCurrentTime]);

    const handlePlayPauseWithRange = useCallback((video: HTMLVideoElement | null) => {
        if (!video) return;
        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
        } else {
            if (video.currentTime < timeRangeRef.current.start || video.currentTime >= timeRangeRef.current.end) {
                video.currentTime = timeRangeRef.current.start;
                setCurrentTime(timeRangeRef.current.start);
            }
            video.play();
            setIsPlaying(true);
        }
    }, [isPlaying, timeRangeRef]);

    return {
        isPlaying,
        setIsPlaying,
        currentTime,
        setCurrentTime,
        handleTimeUpdate: handleTimeUpdateWithRange,
        handlePlayPause: handlePlayPauseWithRange,
        handleScrubberChange,
    };
}