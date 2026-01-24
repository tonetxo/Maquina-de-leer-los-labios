import { useState, useRef, useCallback } from 'react';

export function useVideoControls(initialTime: number = 0) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTimeState] = useState(initialTime);
    const isPlayingRef = useRef(isPlaying);

    const setCurrentTime = useCallback((time: number) => {
        if (time === undefined || time === null || isNaN(time)) {
            console.warn('setCurrentTime received invalid value:', time);
            return;
        }
        setCurrentTimeState(time);
    }, []);

    isPlayingRef.current = isPlaying;

    const handleTimeUpdate = useCallback((video: HTMLVideoElement | null) => {
        if (!video) return;
        const time = video.currentTime;
        setCurrentTime(time);
        return time;
    }, []);

    const handlePlayPause = useCallback((video: HTMLVideoElement | null) => {
        if (!video) return;
        if (isPlayingRef.current) {
            video.pause();
            setIsPlaying(false);
        } else {
            video.play();
            setIsPlaying(true);
        }
    }, []);

    const handleScrubberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, video: HTMLVideoElement | null) => {
        if (!video) return;
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        video.currentTime = newTime;
    }, []);

    const resetVideoTime = useCallback((video: HTMLVideoElement | null, startTime: number) => {
        if (!video) return;
        video.currentTime = startTime;
        setCurrentTime(startTime);
    }, []);

    return {
        isPlaying,
        setIsPlaying,
        currentTime,
        setCurrentTime,
        handleTimeUpdate,
        handlePlayPause,
        handleScrubberChange,
        resetVideoTime,
    };
}