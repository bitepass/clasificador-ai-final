import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { processExcel, classifyRelatoBatch } from "./services/geminiService";
import { procesarExcel } from "./services/excelService";
import FileUpload from "./components/FileUpload";
import StepIndicator from "./components/StepIndicator";
import ResultsDisplay from "./components/ResultsDisplay";
import { AppStep } from "./types";
import "./index.css";

const App = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [results, setResults] = useState<any[]>([]);
  const [logText, setLogText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setStep(AppStep.PROCESSING);
    setError("");
    setIsProcessing(true);

    // Usar Gemini AI
    processExcel(file)
      .then(async (rows) => {
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const { classifiedData, log } = await classifyRelatoBatch(genAI, rows);
        setResults(classifiedData);
        setLogText(log);
        setStep(AppStep.RESULTS);
      })
      .catch((err) => {
        console.error("Error processing file:", err);
        setError("Hubo un error al procesar el archivo con IA.");
        setStep(AppStep.UPLOAD);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  // Clasificación legal local (sin IA)
  const handleClasificacionLegalLocal = async () => {
    if (!uploadedFile) {
      setError("Por favor cargá un archivo Excel primero.");
      return;
    }

    setIsProcessing(true);
    setError("");
    
    try {
      // Esta función ya descarga automáticamente, pero podríamos modificarla
      await procesarExcel(uploadedFile);
      alert("Archivos descargados exitosamente (Excel + LOG)");
    } catch (err) {
      console.error("Error en clasificación legal:", err);
      setError("Error al procesar con lógica legal local.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (results.length > 0) {
      // Tu lógica actual de descarga con ZIP
      const zip = new JSZip();
      // ... resto del código
    }
  };

  const resetApp = () => {
    setUploadedFile(null);
    setStep(AppStep.UPLOAD);
    setResults([]);
    setLogText("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-center">Clasificador de Delitos 1.0</h1>
        <StepIndicator step={step} />
        
        {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
        
        {step === AppStep.UPLOAD && (
          <div>
            <FileUpload onFileUpload={handleFileUpload} />
            {uploadedFile && (
              <div className="text-center mt-4">
                <p className="mb-2">Archivo cargado: {uploadedFile.name}</p>
                <button
                  onClick={handleClasificacionLegalLocal}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded shadow"
                >
                  {isProcessing ? "Procesando..." : "Procesar con Lógica Legal (Sin IA)"}
                </button>
              </div>
            )}
          </div>
        )}
        
        {step === AppStep.PROCESSING && (
          <div className="text-center">
            <p>Procesando con IA...</p>
          </div>
        )}
        
        {step === AppStep.RESULTS && (
          <div>
            <ResultsDisplay results={results} onDownload={handleDownload} />
            <div className="text-center mt-4">
              <button
                onClick={resetApp}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded shadow mr-2"
              >
                Procesar Otro Archivo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;