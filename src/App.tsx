import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { classifyRelatoBatch, downloadExcel, downloadLog, processExcel as readExcelFile } from "./services/geminiService"; // Alias processExcel para evitar conflicto
import { procesarExcel as procesarExcelLocal } from "./services/excelService"; // Alias procesarExcel
import FileUpload from "./components/FileUpload";
import StepIndicator from "./components/StepIndicator";
import ResultsDisplay from "./components/ResultsDisplay";
import { AppStep, ProcessedRowData } from "./types"; // Importar ProcessedRowData
import { Header } from "./components/Header"; // Importar Header
import { Footer } from "./components/Footer"; // Importar Footer
import { GEMINI_MODEL_NAME } from "./constants"; // Importar el nombre del modelo de constantes
import { ErrorModal } from "./components/ErrorModal"; // Importar ErrorModal

import "./index.css";

const App = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [results, setResults] = useState<ProcessedRowData[]>([]); // Usar el tipo correcto
  const [logText, setLogText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Variable global para guardar el último archivo subido (necesario para el botón de legal local en ResultsDisplay)
  // ESTO NO ES UNA BUENA PRÁCTICA en React. Idealmente, pasa `uploadedFile` como prop o maneja el estado.
  // Lo mantengo por compatibilidad con tu estructura, pero considera refactorizar.
  declare global {
    interface Window {
      __lastUploadedFile__: File | null;
    }
  }
  window.__lastUploadedFile__ = uploadedFile;


  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    window.__lastUploadedFile__ = file; // Actualizar la variable global
    setStep(AppStep.PROCESSING);
    setError("");
    setResults([]); // Limpiar resultados anteriores
    setLogText(""); // Limpiar log anterior
    setIsProcessing(true);

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) {
      const errMsg = "Error: La clave de API de Gemini (VITE_GEMINI_API_KEY) no está configurada. Asegúrate de tener un archivo .env.local con la clave.";
      console.error(errMsg);
      setError(errMsg);
      setStep(AppStep.UPLOAD);
      setIsProcessing(false);
      return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    readExcelFile(file) // Usar el alias
      .then(async (rows) => {
        const { classifiedData, log } = await classifyRelatoBatch(genAI, rows); // Ahora devuelve log
        setResults(classifiedData);
        setLogText(log);
        setStep(AppStep.RESULTS);
      })
      .catch((err) => {
        console.error("Error processing file with AI:", err);
        setError(`Hubo un error al procesar el archivo con IA: ${err.message || err}`);
        setStep(AppStep.UPLOAD);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  // Clasificación legal local (sin IA)
  const handleProcessLegalLocal = async () => {
    if (!uploadedFile) {
      setError("Por favor carga un archivo Excel primero.");
      return;
    }

    setIsProcessing(true);
    setError("");
    
    try {
      // Esta función ya descarga automáticamente, y devuelve Promise<void>
      await procesarExcelLocal(uploadedFile); // Usar el alias
      // No necesitamos setear resultados o log aquí, ya que excelService lo maneja.
      // Pero podemos volver a la pantalla de carga para que el usuario suba otro archivo.
      resetApp(); // Resetear para permitir nueva carga o procesamiento
      alert("Archivos descargados exitosamente (Excel Clasificado + LOG de Lógica Legal).");
    } catch (err) {
      console.error("Error en clasificación legal local:", err);
      setError(`Error al procesar con lógica legal local: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadExcel = () => {
    if (results.length > 0) {
      const excelBlob = downloadExcel(results, "San Martín 2025 - Clasificado IA.xlsx"); // Usar el nombre de archivo más descriptivo
      saveAs(excelBlob, "San Martín 2025 - Clasificado IA.xlsx");
    }
  };

  const handleDownloadLog = () => {
    if (logText) {
      const logBlob = downloadLog(logText, "San Martín 2025 - Clasificador IA LOG.txt"); // Usar el nombre de archivo más descriptivo
      saveAs(logBlob, "San Martín 2025 - Clasificador IA LOG.txt");
    }
  };


  const resetApp = () => {
    setUploadedFile(null);
    window.__lastUploadedFile__ = null; // Limpiar también la variable global
    setStep(AppStep.UPLOAD);
    setResults([]);
    setLogText("");
    setError("");
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      <Header /> {/* Agregado el componente Header */}
      <main className="flex-grow max-w-4xl mx-auto p-4 flex flex-col items-center justify-center w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Clasificador de Delitos</h1>
        <StepIndicator currentStep={step} /> {/* Cambiado 'step' a 'currentStep' */}
        
        {error && <ErrorModal message={error} onClose={() => setError("")} />} {/* Usar ErrorModal */}
        
        {step === AppStep.UPLOAD && (
          <FileUpload onFileUpload={handleFileUpload} disabled={isProcessing}/>
        )}
        
        {step === AppStep.PROCESSING && (
          <ProcessingView 
            progress={50} // Puedes implementar lógica de progreso real aquí
            message="Analizando relatos con Inteligencia Artificial..."
            estimatedTime="Esto puede tomar unos minutos, dependiendo de la cantidad de filas."
            onCancel={resetApp} // Permitir cancelar y resetear
          />
        )}
        
        {step === AppStep.RESULTS && (
          <ResultsDisplay
            results={results}
            onDownloadExcel={handleDownloadExcel} // Nueva prop
            onDownloadLog={handleDownloadLog} // Nueva prop
            onReset={resetApp}
            onProcessLegalLocal={handleProcessLegalLocal} // Pasar la función al ResultsDisplay
          />
        )}
      </main>
      <Footer /> {/* Agregado el componente Footer */}
    </div>
  );
};

export default App;