import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveAs } from "file-saver";
import { ClasificacionLegal, FilaExcel, ProcessedRowData, CLASIFICACION_DEFAULT } from '../types'; // Importar CLASIFICACION_DEFAULT y ProcessedRowData
import { GEMINI_MODEL_NAME } from '../constants'; // Importar el nombre del modelo de constantes

// Nota: La función processExcel aquí es redundante con procesarExcel en excelService.ts.
// Si solo la usas para leer el JSON, podrías moverla o simplificarla.
export async function processExcel(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<any>(sheet);
  return json;
}

// **Función de clasificación corregida y más robusta**
export async function classifyRelatoBatch(genAI: GoogleGenerativeAI, rows: FilaExcel[]): Promise<{ classifiedData: ProcessedRowData[]; log: string }> {
  // Usar directamente el nombre del modelo de constantes.
  // La configuración 'api_version' puede ser el problema. La quitamos si no es necesaria o la ajustamos.
  // La forma más común de inicializar el modelo es solo con el nombre:
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME }); // Usar la constante

  const classifiedData: ProcessedRowData[] = [];
  const logEntries: string[] = [`LOG DE CLASIFICACIÓN CON IA: ${new Date().toLocaleString()}\n`];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Normalizar el relato para procesamiento y display
    const relato = (row.relato || row.RELATO || "").toString().trim(); // Asegurarse de que sea string

    // Crear una base para la fila procesada, incluyendo el índice original y el relato normalizado
    const baseProcessedRow: ProcessedRowData = {
      ...row,
      originalIndex: i, // Guardar el índice base 0
      RELATO_NORMALIZED_VALUE: relato,
      classification: { ...CLASIFICACION_DEFAULT }, // Inicializar con valores por defecto
      errorMessage: undefined // Resetear error
    };
    
    if (!relato) { // Si el relato está vacío después de trim
      classifiedData.push({
        ...baseProcessedRow,
        errorMessage: "Relato vacío, usando valores por defecto."
      });
      logEntries.push(`Fila ${i + 2}: Relato vacío - Clasificación por defecto aplicada.\n`);
      continue; // Pasar a la siguiente fila
    }

    try {
      const prompt = `Analizá el siguiente relato delictivo según el Código Penal Argentino: "${relato}". 
      Devolvé ÚNICAMENTE un JSON con estas claves exactas y sus valores deben ser de la lista de opciones dada:
      {
        "CALIFICACION LEGAL": "ROBO|HURTO|LESIONES|HOMICIDIO|NINGUNO DE INTERÉS",
        "MODALIDAD": "ASALTO|MOTOCHORRO|ENTRADERA|VIOLENCIA DE GÉNERO|NO ESPECIFICADO",
        "ARMA": "FUEGO|BLANCA|NO ESPECIFICADO",
        "LESIONADA": "SI|NO",
        "VICTIMA": "MASCULINO|FEMENINO|NO ESPECIFICADO",
        "IMPUTADO": "MASCULINO|FEMENINO|NO ESPECIFICADO"
      }
      Si un valor no aplica o no se puede determinar, usa "NO ESPECIFICADO" o "NO" según corresponda.`; // Pequeña mejora al prompt

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Limpiar respuesta para extraer JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let clasificacion: ClasificacionLegal = { ...CLASIFICACION_DEFAULT }; // Inicializar con defecto
      let errorParsing = false;

      if (jsonMatch && jsonMatch[0]) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          // Asegurarse de que todas las claves esperadas estén presentes y sean strings
          for (const key of Object.keys(CLASIFICACION_DEFAULT) as (keyof ClasificacionLegal)[]) {
            if (typeof parsed[key] === 'string') {
              clasificacion[key] = parsed[key].toUpperCase().trim(); // Convertir a mayúsculas y limpiar espacios
            }
          }
        } catch (parseError) {
          errorParsing = true;
          console.error(`Error al parsear JSON de la IA para fila ${i + 2}:`, parseError);
          baseProcessedRow.errorMessage = `Error al parsear JSON de IA: ${parseError}`;
        }
      } else {
        errorParsing = true;
        baseProcessedRow.errorMessage = "La IA no devolvió un JSON válido.";
      }
      
      classifiedData.push({
        ...baseProcessedRow,
        classification: clasificacion,
        errorMessage: errorParsing ? baseProcessedRow.errorMessage : undefined // Solo si hubo un error de parseo
      });

      logEntries.push(`Fila ${i + 2}: Procesado con IA`);
      logEntries.push(`Relato: "${relato}"`);
      logEntries.push(`Respuesta cruda de IA: "${text}"`);
      logEntries.push(`Clasificación obtenida: ${JSON.stringify(clasificacion, null, 2)}`);
      if (baseProcessedRow.errorMessage) {
        logEntries.push(`ATENCIÓN: ${baseProcessedRow.errorMessage}`);
      }
      logEntries.push('---\n');
      
    } catch (error: any) { // Usar 'any' temporalmente para 'error'
      console.error(`Error general al procesar fila ${i + 2} con IA:`, error);
      classifiedData.push({
        ...baseProcessedRow,
        classification: { ...CLASIFICACION_DEFAULT }, // Asegurarse de que siempre haya una clasificación por defecto
        errorMessage: `Error de IA: ${error.message || error}`
      });
      logEntries.push(`Fila ${i + 2}: ERROR DE IA - ${error.message || error}`);
      logEntries.push('---\n');
    }
  }

  return {
    classifiedData,
    log: logEntries.join('\n')
  };
}

// Estas funciones de descarga están bien, las dejo como están
export function downloadExcel(data: any[], filename = "San Martín 2025 - Clasificado.xlsx"): Blob {
  const newSheet = XLSX.utils.json_to_sheet(data);
  const newWB = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWB, newSheet, 'Clasificado');
  const wbout = XLSX.write(newWB, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/octet-stream' });
}

export function downloadLog(logText: string, filename = "San Martín 2025 - Clasificador LOG.txt"): Blob {
  return new Blob([logText], { type: 'text/plain;charset=utf-8' });
}