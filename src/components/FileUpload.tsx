import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from './icons/UploadCloudIcon';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, disabled }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      if (event.dataTransfer.files[0].type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || event.dataTransfer.files[0].type === "application/vnd.ms-excel") {
        setSelectedFile(event.dataTransfer.files[0]);
      } else {
        alert("Por favor, sube un archivo Excel (.xlsx o .xls).");
      }
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleSubmit = () => {
    if (selectedFile && !disabled) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div className="w-full text-center">
      <h2 className="text-3xl font-bold text-sky-400 mb-6">Clasificar Archivo Excel</h2>
      <p className="text-slate-300 mb-8">
        Sube tu archivo Excel (.xlsx, .xls). Asegúrate de que contenga una columna llamada 'RELATO' (o similar) con las descripciones de los hechos delictivos.
      </p>
      
      <label
        htmlFor="file-upload"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mt-2 flex justify-center items-center w-full h-64 px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-sky-500 bg-slate-700' : 'border-slate-600 hover:border-sky-500'} border-dashed rounded-md cursor-pointer transition-colors duration-200 ease-in-out`}
      >
        <div className="space-y-1 text-center">
          <UploadCloudIcon className="mx-auto h-12 w-12 text-slate-400" />
          <div className="flex text-sm text-slate-400">
            <span className="font-medium text-sky-400 hover:text-sky-300">Sube un archivo</span>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx, .xls" disabled={disabled}/>
            <p className="pl-1">o arrástralo y suéltalo aquí</p>
          </div>
          <p className="text-xs text-slate-500">Archivos XLSX, XLS hasta 10MB</p>
          {selectedFile && <p className="text-sm text-sky-300 mt-2">Archivo seleccionado: {selectedFile.name}</p>}
        </div>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!selectedFile || disabled}
        className="mt-8 w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
      >
        Procesar Archivo
      </button>
    </div>
  );
};
export default FileUpload;
