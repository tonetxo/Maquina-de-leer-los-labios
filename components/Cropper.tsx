import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CropArea, TimeRange } from '../types';
import { PlayIcon, StopIcon } from './Icons';
import { formatTime } from '../utils/formatTime';

type CropperProps = {
    videoUrl: string;
    timeRange: TimeRange;
    initialCropArea: CropArea | null;
    onCropConfirm: (crop: CropArea) => void;
    onCancel: () => void;
};

const Cropper: React.FC<CropperProps> = ({ videoUrl, timeRange, initialCropArea, onCropConfirm, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [videoGeom, setVideoGeom] = useState({ renderWidth: 0, renderHeight: 0, xOffset: 0, yOffset: 0 });
    const [currentTime, setCurrentTime] = useState(timeRange.start);
    const [isPlaying, setIsPlaying] = useState(false);
    const dragInfo = useRef({ active: false, type: '', startX: 0, startY: 0, startBox: { ...cropBox } });
    const initialCropSetRef = useRef(false);

    useEffect(() => {
        if(videoRef.current) {
            videoRef.current.currentTime = timeRange.start;
        }
    }, [timeRange.start]);
    
    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video || !container) return;

        const calculateGeom = () => {
            const { videoWidth, videoHeight, clientWidth, clientHeight } = video;
            if (!videoWidth || !videoHeight || !clientWidth || !clientHeight) return;
            
            const containerRect = container.getBoundingClientRect();
            const videoElementRect = video.getBoundingClientRect();

            const videoElementXInContainer = videoElementRect.left - containerRect.left;
            const videoElementYInContainer = videoElementRect.top - containerRect.top;

            const videoAspectRatio = videoWidth / videoHeight;
            const elementAspectRatio = clientWidth / clientHeight;

            let renderWidth, renderHeight, xOffset, yOffset;

            if (videoAspectRatio > elementAspectRatio) {
                renderWidth = clientWidth;
                renderHeight = clientWidth / videoAspectRatio;
                xOffset = videoElementXInContainer;
                yOffset = videoElementYInContainer + (clientHeight - renderHeight) / 2;
            } else {
                renderHeight = clientHeight;
                renderWidth = clientHeight * videoAspectRatio;
                yOffset = videoElementYInContainer;
                xOffset = videoElementXInContainer + (clientWidth - renderWidth) / 2;
            }
            setVideoGeom({ renderWidth, renderHeight, xOffset, yOffset });
        };

        if (video.readyState >= 1) { // METADATA_LOADED
            calculateGeom();
        } else {
            video.addEventListener('loadedmetadata', calculateGeom, { once: true });
        }
        
        const handleResize = () => calculateGeom();
        window.addEventListener('resize', handleResize);

        return () => {
            if (video) video.removeEventListener('loadedmetadata', calculateGeom);
            window.removeEventListener('resize', handleResize);
        }
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (videoGeom.renderWidth > 0 && video && video.videoWidth > 0 && !initialCropSetRef.current) {
            if (initialCropArea && initialCropArea.width > 0) {
                const scaleX = videoGeom.renderWidth / video.videoWidth;
                const scaleY = videoGeom.renderHeight / video.videoHeight;

                setCropBox({
                    x: (initialCropArea.x * scaleX) + videoGeom.xOffset,
                    y: (initialCropArea.y * scaleY) + videoGeom.yOffset,
                    width: initialCropArea.width * scaleX,
                    height: initialCropArea.height * scaleY,
                });
            } else {
                const initialWidth = Math.min(200, videoGeom.renderWidth * 0.8);
                const initialHeight = Math.min(100, videoGeom.renderHeight * 0.5);
                setCropBox({
                    x: videoGeom.xOffset + (videoGeom.renderWidth - initialWidth) / 2,
                    y: videoGeom.yOffset + (videoGeom.renderHeight - initialHeight) / 2,
                    width: initialWidth,
                    height: initialHeight
                });
            }
            initialCropSetRef.current = true;
        }
    }, [videoGeom, initialCropArea, videoRef]);


    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        if (isPlaying && time >= timeRange.end) {
            videoRef.current.pause();
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

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: string) => {
        e.preventDefault();
        e.stopPropagation();
        dragInfo.current = {
            active: true,
            type,
            startX: e.clientX,
            startY: e.clientY,
            startBox: { ...cropBox },
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragInfo.current.active || videoGeom.renderWidth === 0) return;
        
        const { type, startX, startY, startBox } = dragInfo.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newBox = { ...startBox };
        
        const vBounds = {
            left: videoGeom.xOffset,
            top: videoGeom.yOffset,
            right: videoGeom.xOffset + videoGeom.renderWidth,
            bottom: videoGeom.yOffset + videoGeom.renderHeight,
        };

        if (type === 'move') {
            newBox.x += dx;
            newBox.y += dy;
        } else {
            if (type.includes('right')) newBox.width += dx;
            if (type.includes('left')) {
                newBox.width -= dx;
                newBox.x += dx;
            }
            if (type.includes('bottom')) newBox.height += dy;
            if (type.includes('top')) {
                newBox.height -= dy;
                newBox.y += dy;
            }
        }
        
        if (newBox.width < 20) {
            const oldWidth = newBox.width;
            newBox.width = 20;
            if(type.includes('left')) newBox.x -= (20 - oldWidth);
        }
        if (newBox.height < 20) {
            const oldHeight = newBox.height;
            newBox.height = 20;
            if(type.includes('top')) newBox.y -= (20 - oldHeight);
        }
        
        if (newBox.x < vBounds.left) {
            if (type.includes('left')) newBox.width += (newBox.x - vBounds.left);
            newBox.x = vBounds.left;
        }
        if (newBox.y < vBounds.top) {
             if (type.includes('top')) newBox.height += (newBox.y - vBounds.top);
            newBox.y = vBounds.top;
        }
        
        if (newBox.x + newBox.width > vBounds.right) {
            newBox.width = vBounds.right - newBox.x;
        }
        if (newBox.y + newBox.height > vBounds.bottom) {
            newBox.height = vBounds.bottom - newBox.y;
        }

        setCropBox(newBox);
    }, [videoGeom]);

    const handleMouseUp = useCallback(() => {
        dragInfo.current.active = false;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const handleConfirm = () => {
        if (!videoRef.current || videoGeom.renderWidth === 0) return;
        const video = videoRef.current;
        const { videoWidth, videoHeight } = video;

        const scaleX = videoWidth / videoGeom.renderWidth;
        const scaleY = videoHeight / videoGeom.renderHeight;

        // Calculate initial natural coordinates from screen coordinates
        let natX = (cropBox.x - videoGeom.xOffset) * scaleX;
        let natY = (cropBox.y - videoGeom.yOffset) * scaleY;
        let natWidth = cropBox.width * scaleX;
        let natHeight = cropBox.height * scaleY;

        // Clamp coordinates to be strictly within video dimensions
        natX = Math.max(0, natX);
        natY = Math.max(0, natY);

        // Ensure crop area does not extend beyond video boundaries
        if (natX + natWidth > videoWidth) {
            natWidth = videoWidth - natX;
        }
        if (natY + natHeight > videoHeight) {
            natHeight = videoHeight - natY;
        }
        
        // Ensure width/height are not negative
        natWidth = Math.max(0, natWidth);
        natHeight = Math.max(0, natHeight);

        const finalCrop = {
            x: Math.round(natX),
            y: Math.round(natY),
            width: Math.round(natWidth),
            height: Math.round(natHeight),
        };
        
        onCropConfirm(finalCrop);
    };

    return (
        <div className="bg-black rounded-lg overflow-hidden relative flex flex-col h-full">
            <div ref={containerRef} className="relative w-full flex-grow flex items-center justify-center">
                <video ref={videoRef} src={videoUrl} className="max-w-full max-h-full object-contain" onTimeUpdate={handleTimeUpdate} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} muted loop />
                <div
                    className="absolute border-2 border-dashed border-purple-400 cursor-move bg-black/20"
                    style={{ 
                        left: `${cropBox.x}px`, 
                        top: `${cropBox.y}px`, 
                        width: `${cropBox.width}px`, 
                        height: `${cropBox.height}px`,
                        visibility: cropBox.width > 0 ? 'visible' : 'hidden',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                >
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-purple-400 rounded-full cursor-nwse-resize" onMouseDown={(e) => handleMouseDown(e, 'top-left')} />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-purple-400 rounded-full cursor-nesw-resize" onMouseDown={(e) => handleMouseDown(e, 'top-right')} />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-purple-400 rounded-full cursor-nesw-resize" onMouseDown={(e) => handleMouseDown(e, 'bottom-left')} />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-purple-400 rounded-full cursor-nwse-resize" onMouseDown={(e) => handleMouseDown(e, 'bottom-right')} />
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
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors">Volver</button>
                    <button onClick={handleConfirm} className="py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">Confirmar Recorte</button>
                </div>
            </div>
        </div>
    );
};

export default Cropper;