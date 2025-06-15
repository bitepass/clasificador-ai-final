
import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { XIcon } from './icons/XIcon';

interface ErrorModalProps {
  message: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-red-500/50 transform transition-all duration-300 ease-in-out scale-100">
        <div className="flex items-center mb-4">
          <AlertTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
          <h3 className="text-xl font-semibold text-red-400">Error</h3>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-200">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="text-slate-300 whitespace-pre-wrap break-words">{message}</p>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};