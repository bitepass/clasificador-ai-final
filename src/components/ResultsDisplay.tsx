import React from 'react';
import { ProcessedRowData, EXCEL_OUTPUT_HEADERS, CLASSIFICATION_LABELS } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { RotateCcwIcon } from './icons/RotateCcwIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface ResultsDisplayProps {
  results: ProcessedRowData[];
  onDownloadExcel: () => void;
  onDownloadLog: () => void;
  onReset: () => void;
  onProcessLegalLocal: () => void;
  logText: string;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, onDownloadExcel, onDownloadLog, onReset, onProcessLegalLocal, logText }) => {
  const totalRows = results.length;
  const successfulClassifications = results.filter(row => !row.errorMessage || row.errorMessage === "Relato vacío, usando valores por defecto.").length;
  const erroredDuringAI = results.filter(row => row.errorMessage && row.errorMessage !== "Relato vacío, usando valores por defecto.").length;
  const rowsToReview = results.filter(row => row.errorMessage);

  return (
    <div className="w-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-emerald-400 mb-4 flex items-center justify-center">
          <CheckCircleIcon className="h-8 w-8 mr-3 text-emerald-400"/>
          Procesamiento Completado
        </h2>
      </div>

      <div className="bg-slate-700/30 p-4 rounded-lg mb-6 text-sm">
        <h3 className="text-lg font-semibold text-sky-300 mb-2">Estadísticas del Proceso:</h3>
        <ul className="list-disc list-inside text-slate-300 space-y-1">
          <li>Total de filas procesadas: <span className="font-semibold text-white">{totalRows}</span></li>
          <li>Clasificaciones exitosas (incluye relatos vacíos): <span className="font-semibold text-emerald-400">{successfulClassifications}</span></li>
          <li>Filas con error de IA (revisión manual): <span className="font-semibold text-red-400">{erroredDuringAI}</span></li>
        </ul>
      </div>

      {rowsToReview.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-amber-600/10 border border-amber-500/30">
          <div className="flex items-center mb-2">
            <AlertTriangleIcon className="h-5 w-5 mr-2 text-amber-400"/>
            <h3 className="text-lg font-semibold text-amber-400">Filas para Revisión Manual ({rowsToReview.length})</h3>
          </div>
          <p className="text-xs text-amber-300 mb-3">
            Las siguientes filas encontraron problemas durante la clasificación automática o estaban vacías. Se utilizaron valores por defecto o no se pudo clasificar. Por favor, revísalas en el archivo Excel y el LOG descargados.
          </p>
          <div className="max-h-48 overflow-y-auto bg-slate-800/50 p-2 rounded text-xs space-y-1">
            {rowsToReview.map(row => (
              <div key={`review-${row.originalIndex}`} className="p-1.5 bg-slate-700/50 rounded">
                <span className="font-semibold text-slate-300">Fila de datos original: {row.originalIndex + 1}</span>
                <span className="text-red-400 ml-2">({row.errorMessage})</span>
                <p className="text-slate-400 truncate">Extracto: {row.RELATO_NORMALIZED_VALUE ? `"${row.RELATO_NORMALIZED_VALUE.substring(0,70)}..."` : "Vacío"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 mb-8 max-h-96 overflow-auto rounded-lg border border-slate-700 shadow-md">
          <p className="text-sm text-slate-400 p-2 bg-slate-700 text-center sticky top-0 z-10">Vista Previa de Resultados (primeras 10 filas)</p>
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700 sticky top-10 z-10">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-sky-300 uppercase tracking-wider"># Original</th>
                {EXCEL_OUTPUT_HEADERS.map(key => (
                  <th key={key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-sky-300 uppercase tracking-wider">
                    {CLASSIFICATION_LABELS[key] || key}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-sky-300 uppercase tracking-wider">Error IA</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {results.slice(0, 10).map((row) => (
                <tr key={row.originalIndex} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{row.originalIndex + 1}</td>
                  {EXCEL_OUTPUT_HEADERS.map(key => (
                    <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 truncate max-w-xs"
                        title={row.classification && row.classification[key] !== undefined ? String(row.classification[key]) : '-'}>
                      {row.classification && row.classification[key] !== undefined ? String(row.classification[key]) : '-'}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-red-400">{row.errorMessage && row.errorMessage !== "Relato vacío, usando valores por defecto." ? row.errorMessage : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length > 10 && <p className="text-xs text-slate-400 p-2 bg-slate-700 text-center">Mostrando primeros 10 resultados. El archivo descargado contendrá todos los datos.</p>}
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onDownloadExcel}
          disabled={results.length === 0}
          className="flex items-center justify-center w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
        >
          <DownloadIcon className="h-5 w-5 mr-2" />
          Descargar Excel Clasificado (IA)
        </button>
        <button
          onClick={onDownloadLog}
          disabled={!logText}
          className="flex items-center justify-center w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
        >
          <DownloadIcon className="h-5 w-5 mr-2" />
          Descargar LOG IA
        </button>
        <button
          onClick={onProcessLegalLocal}
          className="flex items-center justify-center w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
        >
          🧠 Generar Excel Legal + LOG (sin IA)
        </button>
      </div>
       <div className="mt-4 text-center">
        <button
          onClick={onReset}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded shadow mr-2"
        >
          Clasificar Otro Archivo
        </button>
      </div>
    </div>
  );
};
export default ResultsDisplay;