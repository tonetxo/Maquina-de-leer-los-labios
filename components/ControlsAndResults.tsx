import React from 'react';
import { Status, Stage } from '../types';
import { CopyIcon, PlayIcon, StopIcon, LoadingSpinnerIcon, CropIcon, ScissorsIcon } from './Icons';

type ControlsAndResultsProps = {
    currentStage: Stage;
    status: Status;
    transcription: string;
    isPlayingAudio: boolean;
    isProcessing: boolean;
    canTranscribe: boolean;
    language: string;
    onLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onSetStage: (stage: Stage) => void;
    onTranscribe: () => void;
    onPlayAudio: () => void;
    onCopy: () => void;
    onDebug: () => void;
};

const ControlsAndResults: React.FC<ControlsAndResultsProps> = ({ 
    currentStage, status, transcription, isPlayingAudio, isProcessing, canTranscribe,
    language, onLanguageChange, onSetStage, onTranscribe, onPlayAudio, onCopy, onDebug
}) => {
    return (
        <div className="flex flex-col space-y-4">
           {currentStage === 'preview' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                  <button
                      onClick={() => onSetStage('selecting_time')}
                      className="w-full flex justify-center items-center gap-3 py-2 px-4 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-all"
                  >
                      <ScissorsIcon className="w-5 h-5" />
                      <span>Adjust Time</span>
                  </button>
                  <button
                      onClick={() => onSetStage('cropping_area')}
                      className="w-full flex justify-center items-center gap-3 py-2 px-4 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                  >
                      <CropIcon className="w-5 h-5" />
                      <span>Adjust Crop</span>
                  </button>
              </div>
              <div>
                <label htmlFor="language-select" className="block text-sm font-medium text-gray-400 mb-1">Select Language</label>
                <select
                  id="language-select"
                  value={language}
                  onChange={onLanguageChange}
                  className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5"
                >
                  <option value="auto">Autodetect (less accurate)</option>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Italian">Italian</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Mandarin Chinese">Mandarin Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                  <option value="Russian">Russian</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={onTranscribe}
              disabled={!canTranscribe}
              className="w-full flex justify-center items-center gap-3 py-3 px-6 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              {isProcessing && <LoadingSpinnerIcon />}
              <span>{isProcessing ? status.message : 'Transcribe Video'}</span>
            </button>
            <button
              onClick={onDebug}
              disabled={!canTranscribe}
              className="w-full flex justify-center items-center gap-3 py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              <span>Debug Frames</span>
            </button>
          </div>
           <p className="text-sm text-gray-500 text-center -mt-2">
             {status.stage !== 'processing' ? status.message : ''}
           </p>

          {status.stage === 'processing' && status.progress !== undefined && (
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${status.progress * 100}%` }}></div>
            </div>
          )}

          {status.stage === 'error' && (
              <p className="text-red-400 text-center">{status.message}</p>
          )}

          <div className="flex-grow bg-gray-900 rounded-lg p-4 relative min-h-[200px] lg:min-h-0">
            <p className="text-sm font-medium text-gray-400 mb-2">Transcription:</p>
            <textarea
              readOnly
              value={transcription}
              placeholder="Transcription will appear here..."
              className="w-full h-full bg-transparent border-none text-gray-300 resize-none focus:ring-0"
              rows={8}
            />
            {transcription && (
              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={onCopy} title="Copy to clipboard" className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
                  <CopyIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={onPlayAudio}
                  title={isPlayingAudio ? "Stop" : "Read aloud"}
                  className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                  disabled={status.stage === 'generating_audio'}
                >
                  {status.stage === 'generating_audio' ? (
                      <LoadingSpinnerIcon className="w-5 h-5" />
                  ) : isPlayingAudio ? (
                      <StopIcon className="w-5 h-5" />
                  ) : (
                      <PlayIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}
          </div>
           <p className="text-xs text-gray-500 text-center pt-2">
             Note: AI lip reading is an experimental technology. Results depend on video quality, lighting, and speaker clarity. Cropping to the lips can improve accuracy.
           </p>
        </div>
    );
};

export default ControlsAndResults;
