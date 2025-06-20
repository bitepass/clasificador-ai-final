import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from './icons/UploadCloudIcon';
import { FileTextIcon } from './icons/FileTextIcon'; // Nuevo icono para la plantilla

interface FileUploadProps {
  onFileUpload: (dataFile: File, templateFile: File | null) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, disabled }) => {
  const [dataExcelFile, setDataExcelFile] = useState<File | null>(null);
  const [templateExcelFile, setTemplateExcelFile] = useState<File | null>(null);
  const [isDraggingData, setIsDraggingData] = useState(false);
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);

  // Función genérica para manejar el cambio de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'data' | 'template') => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileName = file.name.toLowerCase();
      // Validar que sea un archivo Excel
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        if (fileType === 'data') {
          setDataExcelFile(file);
        } else {
          setTemplateExcelFile(file);
        }
      } else {
        alert("Por favor, sube un archivo Excel (.xlsx o .xls).");
        event.target.value = ''; // Limpiar el input para permitir seleccionar de nuevo
      }
    }
  };

  // Función genérica para manejar el drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>, fileType: 'data' | 'template') => {
    event.preventDefault();
    event.stopPropagation();
    if (fileType === 'data') setIsDraggingData(false);
    else setIsDraggingTemplate(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        if (fileType === 'data') {
          setDataExcelFile(file);
        } else {
          setTemplateExcelFile(file);
        }
      } else {
        alert("Por favor, sube un archivo Excel (.xlsx o .xls).");
      }
    }
  }, []);

  // Funciones genéricas para drag over/leave
  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>, fileType: 'data' | 'template') => {
    event.preventDefault();
    event.stopPropagation();
    if (fileType === 'data') setIsDraggingData(true);
    else setIsDraggingTemplate(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>, fileType: 'data' | 'template') => {
    event.preventDefault();
    event.stopPropagation();
    if (fileType === 'data') setIsDraggingData(false);
    else setIsDraggingTemplate(false);
  }, []);

  const handleSubmit = () => {
    // Ahora enviamos ambos archivos. Si templateExcelFile es null, se maneja en App.tsx.
    if (dataExcelFile && !disabled) {
      onFileUpload(dataExcelFile, templateExcelFile);
    } else {
      alert("Por favor, sube la base de datos Excel antes de procesar.");
    }
  };

  return (
    <div className="w-full text-center">
      <h2 className="text-3xl font-bold text-sky-400 mb-6">Clasificar Archivos Excel</h2>
      <p className="text-slate-300 mb-8">
        Para clasificar, sube dos archivos: primero la base de datos con los relatos, y luego la plantilla oficial de la delegación.
      </p>
      
      {/* Sección para subir la Base de Datos de Relatos */}
      <label
        htmlFor="data-file-upload"
        onDrop={(e) => handleDrop(e, 'data')}
        onDragOver={(e) => handleDragOver(e, 'data')}
        onDragLeave={(e) => handleDragLeave(e, 'data')}
        className={`mt-2 flex flex-col justify-center items-center w-full h-48 px-6 pt-5 pb-6 border-2 ${isDraggingData ? 'border-sky-500 bg-slate-700' : 'border-slate-600 hover:border-sky-500'} border-dashed rounded-md cursor-pointer transition-colors duration-200 ease-in-out`}
      >
        <UploadCloudIcon className="mx-auto h-10 w-10 text-slate-400" />
        <div className="flex text-sm text-slate-400">
          <span className="font-medium text-sky-400 hover:text-sky-300">Sube la Base de Datos con Relatos</span>
          <input id="data-file-upload" name="data-file-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'data')} accept=".xlsx, .xls" disabled={disabled}/>
          <p className="pl-1">o arrástrala aquí</p>
        </div>
        <p className="text-xs text-slate-500">Archivos XLSX, XLS</p>
        {dataExcelFile && <p className="text-sm text-sky-300 mt-2">Base de datos seleccionada: {dataExcelFile.name}</p>}
      </label>

      {/* Sección para subir la Plantilla DELEGACION.xlsx */}
      <label
        htmlFor="template-file-upload"
        onDrop={(e) => handleDrop(e, 'template')}
        onDragOver={(e) => handleDragOver(e, 'template')}
        onDragLeave={(e) => handleDragLeave(e, 'template')}
        className={`mt-4 flex flex-col justify-center items-center w-full h-48 px-6 pt-5 pb-6 border-2 ${isDraggingTemplate ? 'border-sky-500 bg-slate-700' : 'border-slate-600 hover:border-sky-500'} border-dashed rounded-md cursor-pointer transition-colors duration-200 ease-in-out`}
      >
        <FileTextIcon className="mx-auto h-10 w-10 text-slate-400" />
        <div className="flex text-sm text-slate-400">
          <span className="font-medium text-sky-400 hover:text-sky-300">Sube la Plantilla DELEGACION.xlsx</span>
          <input id="template-file-upload" name="template-file-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'template')} accept=".xlsx, .xls" disabled={disabled}/>
          <p className="pl-1">o arrástrala aquí</p>
        </div>
        <p className="text-xs text-slate-500">Plantilla oficial con formato, filtros y listas desplegables.</p>
        {templateExcelFile && <p className="text-sm text-sky-300 mt-2">Plantilla seleccionada: {templateExcelFile.name}</p>}
      </label>

      <button
        onClick={handleSubmit}
        disabled={!dataExcelFile || disabled} // Solo requiere la base de datos para habilitar
        className="mt-8 w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
      >
        Procesar Archivos
      </button>
    </div>
  );
};
export default FileUpload;