import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FileUpload } from './components/FileUpload';
import { ResultsDisplay } from './components/ResultsDisplay';
import { ProcessedData } from './types';
import { processFile } from './services/geminiService';

function App() {
  const [results, setResults] = useState<ProcessedData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileProcess = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setFileName(file.name);

    try {
      const processedResults = await processFile(file);
      setResults(processedResults);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error desconocido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
    setIsLoading(false);
    setFileName('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {!results && !isLoading && !error && (
            <FileUpload onFileProcess={handleFileProcess} />
          )}
          {isLoading && (
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
              <p className="text-lg text-gray-700">Procesando archivo, por favor espera...</p>
              <div className="mt-4 animate-spin h-8 w-8 text-blue-600 mx-auto" />
            </div>
          )}
          {error && (
            <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-2">Error</h2>
              <p>{error}</p>
              <button
                onClick={handleReset}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Intentar de Nuevo
              </button>
            </div>
          )}
          {results && (
            <ResultsDisplay results={results} onReset={handleReset} fileName={fileName} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;