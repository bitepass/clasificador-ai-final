
import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon'; // Or a more generic InfoIcon
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon'; // For confirm button

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmButtonClass = "bg-red-600 hover:bg-red-700",
  cancelButtonClass = "bg-slate-600 hover:bg-slate-700"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out" onClick={onCancel}>
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-sky-500/50 transform transition-all duration-300 ease-in-out scale-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center mb-4">
          <AlertTriangleIcon className="h-8 w-8 text-amber-400 mr-3" /> {/* Changed color to amber */}
          <h3 className="text-xl font-semibold text-sky-300">{title}</h3>
          <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-200">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="text-slate-300 whitespace-pre-wrap break-words mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={`${cancelButtonClass} text-white font-semibold py-2 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50 flex items-center`}
          >
            <XIcon className="h-5 w-5 mr-1.5"/>
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${confirmButtonClass} text-white font-semibold py-2 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center`}
          >
             {/* Using a generic check or specific icon might be better than CheckCircle for confirm */}
            <CheckCircleIcon className="h-5 w-5 mr-1.5"/>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};