import React, { useState } from "react";
import { saveAs } from "file-saver";
import FileUpload from "./components/FileUpload";
import StepIndicator from "./components/StepIndicator";
import ResultsDisplay from "./components/ResultsDisplay";
import { AppStep, ProcessedRowData } from "./types";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ErrorModal } from "./components/ErrorModal";

import "./index.css";

const App = () => {
  const [dataExcelFile, setDataExcelFile] = useState<File | null>(null);
  const [templateExcelFile, setTemplateExcelFile] = useState<File | null>(null);
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [results, setResults] = useState<ProcessedRowData[]>([]); // Los resultados para la tabla de UI (ahora menos crítica, más para mostrar proceso)
  const [logText, setLogText] = useState<string>(""); // Log completo del backend
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [estimatedProcessingTime, setEstimatedProcessingTime] = useState<string>("");

  // Variable global para guardar el último archivo de datos subido
  declare global {
    interface Window {
      __lastUploadedFile__: File | null;
    }
  }
  window.__lastUploadedFile__ = dataExcelFile;

  // URL de tu backend Flask. ¡Asegúrate de que el puerto coincida con el de app.py!
  const BACKEND_URL = "http://localhost:5000";

  const calculateEstimatedTime = (numberOfRows: number) => {
    const averageTimePerRelatoMs = 3500; // Estimación del tiempo que tarda el backend
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
      timeMessage = "unos segundos";
    }

    return `Esto puede tomar aproximadamente ${timeMessage}, dependiendo de la cantidad de filas.`;
  };

  // Esta función ahora envía los archivos al backend
  const handleFileUpload = async (dataFile: File, templateFile: File | null) => {
    setDataExcelFile(dataFile);
    setTemplateExcelFile(templateFile);
    window.__lastUploadedFile__ = dataFile; // Actualizar global

    setStep(AppStep.PROCESSING);
    setError("");
    setResults([]);
    setLogText("");
    setIsProcessing(true);
    setEstimatedProcessingTime("Enviando archivos al servidor...");

    // Crear FormData para enviar los archivos al backend
    const formData = new FormData();
    formData.append("dataFile", dataFile);
    if (templateFile) {
      formData.append("templateFile", templateFile);
    }

    try {
      // No leer el Excel aquí, solo obtener el número de filas para la estimación
      // Podrías hacer una pequeña función auxiliar si necesitas las filas antes de enviar al backend
      // Por ahora, asumimos que el número de filas se puede estimar o el backend lo maneja.
      // Para esta demostración, no podemos estimar filas sin leer el Excel aquí.
      // Mantendremos una estimación simple o la quitamos si no hay acceso a las filas.
      // Si quieres la estimación precisa, tendríamos que leer el dataFile aquí para contar las filas.
      setEstimatedProcessingTime(calculateEstimatedTime(100)); // Poniendo un número fijo para la demo (ej: 100 filas)

      const response = await fetch(`${BACKEND_URL}/process-excel`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error del servidor: ${response.status} ${response.statusText}`);
      }

      // Si el backend devuelve el archivo Excel
      const blob = await response.blob();
      saveAs(blob, `Clasificado_Final_${new Date().getTime()}.xlsx`); // Guardar el Excel final del backend

      setLogText("Procesamiento completado por el servidor. Archivo Excel final descargado.");
      setStep(AppStep.RESULTS);

    } catch (err: any) {
      console.error("Error al comunicarse con el backend:", err);
      setError(`Error al procesar: ${err.message || err}. Asegúrate que el servidor de backend esté corriendo.`);
      setStep(AppStep.UPLOAD);
    } finally {
      setIsProcessing(false);
      setEstimatedProcessingTime("");
    }
  };

  // La lógica de procesarExcelLocal (sin IA) ahora también debe llamar al backend,
  // o se mantiene como una opción muy básica que no usa la plantilla.
  // Por simplicidad, por ahora este botón ya no llamará a una función local de ExcelService
  // sino que si la queremos con formato de plantilla, iría por backend.
  // Si el backend es para *ambas* IA y Legal Local, el endpoint debería manejarlo.
  // O podemos eliminar este botón si el backend se encarga de todo.
  const handleProcessLegalLocal = async () => {
    setError("Esta opción requiere el backend para generar el Excel con formato completo. Por favor, procese el archivo principal.");
    // O si quieres que aún genere un Excel básico sin formato desde el frontend:
    // if (!dataExcelFile) { setError("Por favor carga la base de datos Excel."); return; }
    // try {
    //   setIsProcessing(true);
    //   await procesarExcelLocal(dataExcelFile, null); // Forzar sin plantilla si no hay backend para eso
    //   alert("Archivos descargados exitosamente (Excel Clasificado con Lógica Legal + LOG Local).");
    // } catch (err:any) { console.error("Error:", err); setError(`Error local: ${err.message}`); }
    // finally { setIsProcessing(false); }
  };


  // Funciones de descarga de logs y excel: AHORA LAS GESTIONA EL BACKEND
  const handleDownloadExcelIA = () => {
    alert("El archivo Excel clasificado ya se descargó automáticamente al finalizar el procesamiento.");
  };

  const handleDownloadLogIA = () => {
    // El LOG completo debería venir del backend junto con el Excel, o se puede pedir en otro endpoint
    alert("El LOG detallado viene con la respuesta del servidor. Por ahora, solo se muestra en consola o necesitará un endpoint de descarga del backend.");
    console.log("LOG completo del servidor:", logText); // Mostrar en consola por ahora
    // Si el backend devuelve el log como parte del JSON de error, o si lo guarda y hay un endpoint para pedirlo.
  };


  const resetApp = () => {
    setDataExcelFile(null);
    setTemplateExcelFile(null);
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
            progress={50} // Puedes hacer que el backend envíe progreso
            message="Enviando archivos y esperando clasificación del servidor..."
            estimatedTime={estimatedProcessingTime}
            onCancel={resetApp}
          />
        )}

        {step === AppStep.RESULTS && (
          <ResultsDisplay
            results={results} // Estos resultados son solo para la vista previa en UI, no el archivo final
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