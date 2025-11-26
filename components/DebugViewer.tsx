import React, { useState, useEffect } from 'react';

type DebugViewerProps = {
    frames: string[];
    onClose: () => void;
};

const DebugViewer: React.FC<DebugViewerProps> = ({ frames, onClose }) => {
    const [selected, setSelected] = useState<{frame: string, index: number} | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selected) return;
            if (e.key === 'ArrowRight') {
                handleNext();
            }
            if (e.key === 'ArrowLeft') {
                handlePrev();
            }
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selected, frames]);

    const handleSelect = (frame: string, index: number) => {
        setSelected({ frame, index });
    };

    const handleClose = () => {
        setSelected(null);
    };

    const handleNext = () => {
        if (selected && selected.index < frames.length - 1) {
            const nextIndex = selected.index + 1;
            setSelected({ frame: frames[nextIndex], index: nextIndex });
        }
    };

    const handlePrev = () => {
        if (selected && selected.index > 0) {
            const prevIndex = selected.index - 1;
            setSelected({ frame: frames[prevIndex], index: prevIndex });
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Debug View: Frames Sent to AI</h3>
                <button 
                    onClick={onClose} 
                    className="py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Close
                </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">Showing {frames.length} frames. Click a frame to enlarge.</p>
            <div className="flex-grow overflow-y-auto pr-2">
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {frames.map((frame, index) => (
                        <div key={index} className="relative aspect-square bg-black rounded-md overflow-hidden cursor-pointer group" onClick={() => handleSelect(frame, index)}>
                            <img 
                                src={`data:image/jpeg;base64,${frame}`}
                                alt={`Frame ${index + 1}`}
                                className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                            />
                            <div className="absolute top-0 right-0 bg-black/50 text-white text-xs px-1 rounded-bl-md">
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selected && (
                <div 
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" 
                    onClick={handleClose}
                >
                    <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {/* Prev Button */}
                        <button 
                            onClick={handlePrev} 
                            disabled={selected.index === 0}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                        </button>

                        {/* Image and Counter */}
                        <div className="flex flex-col items-center justify-center gap-4">
                             <img 
                                src={`data:image/jpeg;base64,${selected.frame}`}
                                alt={`Frame ${selected.index + 1}`}
                                className="max-h-[80vh] max-w-[80vw] object-contain shadow-2xl rounded-lg"
                            />
                            <p className="text-white/80 font-semibold text-lg">{selected.index + 1} / {frames.length}</p>
                        </div>

                        {/* Next Button */}
                        <button 
                            onClick={handleNext} 
                            disabled={selected.index === frames.length - 1}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                        </button>

                         {/* Close Button */}
                        <button onClick={handleClose} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebugViewer;