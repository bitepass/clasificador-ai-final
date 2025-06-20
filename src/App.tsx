import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveAs } from "file-saver";
import { classifyRelatoBatch, downloadExcel, downloadLog, readExcelFile } from "./services/geminiService";
import { procesarExcel as procesarExcelLocal } from "./services/excelService";
import FileUpload from "./components/FileUpload";
import StepIndicator from "./components/StepIndicator";
import ResultsDisplay from "./components/ResultsDisplay";
import { AppStep, ProcessedRowData } from "./types";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { GEMINI_MODEL_NAME } from "./constants";
import { ErrorModal } from "./components/ErrorModal";
import { ProcessingView } from "./components/ProcessingView";

import "./index.css";

const App = () => {
  const [dataExcelFile, setDataExcelFile] = useState<File | null>(null);
  const [templateExcelFile, setTemplateExcelFile] = useState<File | null>(null);
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [results, setResults] = useState<ProcessedRowData[]>([]);
  const [logText, setLogText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [estimatedProcessingTime, setEstimatedProcessingTime] = useState<string>("");

  // Variable global para guardar el último archivo de datos subido (para la lógica legal local)
  declare global {
    interface Window {
      __lastUploadedFile__: File | null;
    }
  }
  window.__lastUploadedFile__ = dataExcelFile;

  const calculateEstimatedTime = (numberOfRows: number) => {
    // Esta es una aproximación. El tiempo real depende de la complejidad del relato
    // y la carga del servidor de la IA. Ajusta este valor después de pruebas reales.
    const averageTimePerRelatoMs = 3500; // Por ejemplo, 3.5 segundos por relato de IA
    const totalEstimatedTimeMs = numberOfRows * averageTimePerRelatoMs;
    
    let timeMessage = "";
    const hours = Math.floor(totalEstimatedTimeMs / 3600000);
    const remainingMinutes = Math.floor((totalEstimatedTimeMs % 3600000) / 60000);
    const remainingSeconds = Math.round((totalEstimatedTimeMs % 60000) / 1000);

    if (hours > 0) {
      timeMessage += `${hours} hora(s) `;
    }
    if (remainingMinutes > 0) {
      timeMessage += `${remainingMinutes} minuto(s) `;
    }
    if (remainingSeconds > 0 || (hours === 0 && remainingMinutes === 0 && numberOfRows > 0)) {
      timeMessage += `${remainingSeconds} segundo(s)`;
    }
    if (timeMessage.trim() === "") {
      timeMessage = "unos segundos"; // Para casos de muy pocas filas o 0 filas
    }

    return `Esto puede tomar aproximadamente ${timeMessage}, dependiendo de la cantidad de filas.`;
  };

  const handleFileUpload = (dataFile: File, templateFile: File | null) => {
    setDataExcelFile(dataFile);
    setTemplateExcelFile(templateFile); // Guardar el archivo de plantilla
    window.__lastUploadedFile__ = dataFile; // Actualizar la variable global

    setStep(AppStep.PROCESSING);
    setError("");
    setResults([]); // Limpiar resultados anteriores
    setLogText(""); // Limpiar log anterior
    setIsProcessing(true);
    setEstimatedProcessingTime("Calculando tiempo estimado..."); // Mensaje inicial

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) {
      const errMsg = "Error: La clave de API de Gemini (VITE_GEMINI_API_KEY) no está configurada. Asegúrate de tener un archivo .env.local con la clave.";
      console.error(errMsg);
      setError(errMsg);
      setStep(AppStep.UPLOAD);
      setIsProcessing(false);
      setEstimatedProcessingTime("");
      return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    readExcelFile(dataFile) // Leer solo el archivo de datos
      .then(async (rows) => {
        if (rows.length === 0) {
          setError("El archivo Excel de datos está vacío o no se pudieron leer las filas.");
          setStep(AppStep.UPLOAD);
          setIsProcessing(false);
          setEstimatedProcessingTime("");
          return;
        }
        setEstimatedProcessingTime(calculateEstimatedTime(rows.length)); // Calcular y mostrar tiempo real

        const { classifiedData, log } = await classifyRelatoBatch(genAI, rows, templateFile);
        setResults(classifiedData);
        setLogText(log);
        setStep(AppStep.RESULTS);
      })
      .catch((err) => {
        console.error("Error processing file with AI:", err);
        setError(`Hubo un error al procesar el archivo con IA: ${err.message || err}. Por favor, verifica tu clave de API, el nombre del modelo o el formato de los archivos.`);
        setStep(AppStep.UPLOAD);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  // Clasificación legal local (sin IA) - Función para el botón de "Generar Excel Legal + LOG (sin IA)"
  // Este botón ahora también descargará el Excel con el formato de la plantilla.
  const handleProcessLegalLocal = async () => {
    // Ahora esta función también necesita la plantilla si queremos que genere un Excel con formato
    if (!dataExcelFile) { // También verifica si templateExcelFile es null si la lógica lo requiere
      setError("Por favor carga la base de datos Excel primero para usar la lógica legal local.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setEstimatedProcessingTime("Procesando con lógica legal local...");
    
    try {
      await procesarExcelLocal(dataExcelFile, templateExcelFile); // Esta función ya maneja la descarga de Excel y LOG
      resetApp(); // Resetear la app después de la descarga
      alert("Archivos descargados exitosamente (Excel Clasificado con Lógica Legal + LOG Local).");
    } catch (err) {
      console.error("Error en clasificación legal local:", err);
      setError(`Error al procesar con lógica legal local: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
      setEstimatedProcessingTime("");
    }
  };

  // Funciones de descarga para el botón "Descargar Excel Clasificado (IA)"
  const handleDownloadExcelIA = () => {
    if (results.length > 0) {
      downloadExcel(results, `San Martín 2025 - Clasificado IA ${new Date().getTime()}.xlsx`, templateExcelFile); // Pasa templateFile
    }
  };

  // Función de descarga para el botón "Descargar LOG IA"
  const handleDownloadLogIA = () => {
    if (logText) {
      downloadLog(logText, `San Martín 2025 - Clasificador LOG IA ${new Date().getTime()}.txt`);
    }
  };

  const resetApp = () => {
    setDataExcelFile(null);
    setTemplateExcelFile(null); // Limpiar también el archivo de plantilla
    window.__lastUploadedFile__ = null;
    setStep(AppStep.UPLOAD);
    setResults([]);
    setLogText("");
    setError("");
    setIsProcessing(false);
    setEstimatedProcessingTime("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      <Header />
      <main className="flex-grow max-w-4xl mx-auto p-4 flex flex-col items-center justify-center w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Clasificador de Delitos</h1>
        <StepIndicator currentStep={step} />
        
        {error && <ErrorModal message={error} onClose={() => setError("")} />}
        
        {step === AppStep.UPLOAD && (
          <FileUpload onFileUpload={handleFileUpload} disabled={isProcessing}/>
        )}
        
        {step === AppStep.PROCESSING && (
          <ProcessingView 
            progress={50}
            message="Analizando relatos con Inteligencia Artificial..."
            estimatedTime={estimatedProcessingTime}
            onCancel={resetApp}
          />
        )}
        
        {step === AppStep.RESULTS && (
          <ResultsDisplay
            results={results}
            onDownloadExcel={handleDownloadExcelIA}
            onDownloadLog={handleDownloadLogIA}
            onReset={resetApp}
            onProcessLegalLocal={handleProcessLegalLocal}
            logText={logText}
          />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;