import React from 'react';
import { UploadIcon } from './Icons';

type UploadScreenProps = {
    isDraggingOver: boolean;
    isProcessing: boolean;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const UploadScreen: React.FC<UploadScreenProps> = ({ isDraggingOver, isProcessing, onDragOver, onDragLeave, onDrop, onFileChange }) => {
    return (
        <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center h-full flex flex-col justify-center transition-colors duration-200 ease-in-out ${isDraggingOver ? 'border-purple-400 bg-gray-700' : 'border-gray-600'}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <input type="file" id="video-upload" className="hidden" accept="video/*" onChange={onFileChange} disabled={isProcessing} />
            <label htmlFor="video-upload" className={`cursor-pointer group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <UploadIcon className="w-12 h-12 mx-auto text-gray-500 group-hover:text-purple-400 transition-colors" />
              <p className="mt-2 text-sm text-gray-400">{isDraggingOver ? 'Drop the video to upload' : 'Click to upload or drag & drop a video'}</p>
            </label>
        </div>
    );
};

export default UploadScreen;
