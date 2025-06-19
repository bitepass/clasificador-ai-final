import React from 'react';
import { Loader2Icon } from './icons/Loader2Icon';
import { XIcon } from './icons/XIcon';

interface ProcessingViewProps {
  progress: number;
  message: string;
  estimatedTime: string; // Ahora pasamos el tiempo estimado directamente
  onCancel: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ progress, message, estimatedTime, onCancel }) => {
  return (
    <div className="w-full text-center py-8">
      <h2 className="text-3xl font-bold text-sky-400 mb-6 flex items-center justify-center">
        <Loader2Icon className="animate-spin h-8 w-8 mr-3 text-sky-400" />
        Procesando...
      </h2>
      <p className="text-slate-300 mb-2">{message}</p>
      <p className="text-sm text-sky-300 mb-4">{estimatedTime}</p> {/* Mostrar el tiempo estimado */}

      <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden shadow-inner mb-6">
        <div
          className="bg-sky-500 h-6 rounded-full text-xs font-medium text-sky-100 text-center p-0.5 leading-none transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        >
          {progress > 5 && `${Math.round(progress)}%`}
        </div>
      </div>

      <button
        onClick={onCancel}
        className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center justify-center mx-auto"
        aria-label="Cancelar procesamiento"
      >
        <XIcon className="h-5 w-5 mr-2"/>
        Cancelar Proceso
      </button>
    </div>
  );
};