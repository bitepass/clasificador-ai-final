import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { classifyRelatoBatch, downloadExcel, downloadLog, processExcel as readExcelFile } from "./services/geminiService";
import { procesarExcel as procesarExcelLocal } from "./services/excelService";
import FileUpload from "./components/FileUpload";
import StepIndicator from "./components/StepIndicator";
import ResultsDisplay from "./components/ResultsDisplay";
import { AppStep, ProcessedRowData } from "./types";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { GEMINI_MODEL_NAME } from "./constants";
import { ErrorModal } from "./components/ErrorModal";
import { ProcessingView } from "./components/ProcessingView"; // Importación correcta

import "./index.css";

const App = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [results, setResults] = useState<ProcessedRowData[]>([]);
  const [logText, setLogText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [estimatedProcessingTime, setEstimatedProcessingTime] = useState<string>(""); // Nuevo estado

  declare global {
    interface Window {
      __lastUploadedFile__: File | null;
    }
  }
  window.__lastUploadedFile__ = uploadedFile;


  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    window.__lastUploadedFile__ = file;
    setStep(AppStep.PROCESSING);
    setError("");
    setResults([]);
    setLogText("");
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

    readExcelFile(file)
      .then(async (rows) => {
        // Calcular tiempo estimado más fiel:
        // Esta es una aproximación. El tiempo real depende de la complejidad del relato
        // y la carga del servidor de la IA. Un buen promedio inicial podría ser:
        const averageTimePerRelatoMs = 3000; // 3 segundos por relato (puedes ajustarlo después de pruebas)
        const totalEstimatedTimeMs = rows.length * averageTimePerRelatoMs;
        
        let timeMessage = "";
        const hours = Math.floor(totalEstimatedTimeMs / 3600000); // 1 hora = 3,600,000 ms
        const remainingMinutes = Math.floor((totalEstimatedTimeMs % 3600000) / 60000);
        const remainingSeconds = Math.round((totalEstimatedTimeMs % 60000) / 1000);

        if (hours > 0) {
          timeMessage += `${hours} hora(s) `;
        }
        if (remainingMinutes > 0) {
          timeMessage += `${remainingMinutes} minuto(s) `;
        }
        if (remainingSeconds > 0 || (hours === 0 && remainingMinutes === 0)) { // Mostrar segundos si es 0 horas y 0 minutos
          timeMessage += `${remainingSeconds} segundo(s)`;
        }
        if (timeMessage.trim() === "") {
          timeMessage = "unos segundos"; // Para casos de muy pocas filas
        }

        setEstimatedProcessingTime(`Esto puede tomar aproximadamente ${timeMessage}, dependiendo de la cantidad de filas.`);

        const { classifiedData, log } = await classifyRelatoBatch(genAI, rows);
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
        setEstimatedProcessingTime(""); // Limpiar al finalizar
      });
  };

  const handleProcessLegalLocal = async () => {
    if (!uploadedFile) {
      setError("Por favor carga un archivo Excel primero.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setEstimatedProcessingTime("Procesando con lógica legal local...");
    
    try {
      await procesarExcelLocal(uploadedFile);
      resetApp();
      alert("Archivos descargados exitosamente (Excel Clasificado + LOG de Lógica Legal).");
    } catch (err) {
      console.error("Error en clasificación legal local:", err);
      setError(`Error al procesar con lógica legal local: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
      setEstimatedProcessingTime("");
    }
  };

  const handleDownloadExcel = () => {
    if (results.length > 0) {
      const excelBlob = downloadExcel(results, "San Martín 2025 - Clasificado IA.xlsx");
      saveAs(excelBlob, "San Martín 2025 - Clasificado IA.xlsx");
    }
  };

  const handleDownloadLog = () => {
    if (logText) {
      const logBlob = downloadLog(logText, "San Martín 2025 - Clasificador IA LOG.txt");
      saveAs(logBlob, "San Martín 2025 - Clasificador IA LOG.txt");
    }
  };


  const resetApp = () => {
    setUploadedFile(null);
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
            onDownloadExcel={handleDownloadExcel}
            onDownloadLog={handleDownloadLog}
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