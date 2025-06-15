import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveAs } from "file-saver";

export async function processExcel(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<any>(sheet);
  return json;
}

export async function classifyRelatoBatch(genAI: GoogleGenerativeAI, rows: any[]) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const classifiedData: any[] = [];
  const logEntries: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const relato = row.relato || row.RELATO || "";
    
    if (!relato.trim()) {
      classifiedData.push({
        ...row,
        "CALIFICACION LEGAL": "NINGUNO DE INTERÉS",
        "MODALIDAD": "NO ESPECIFICADO",
        "ARMA": "NO ESPECIFICADO",
        "LESIONADA": "NO",
        "VICTIMA": "NO ESPECIFICADO",
        "IMPUTADO": "NO ESPECIFICADO"
      });
      logEntries.push(`Fila ${i + 2}: Relato vacío - Clasificación por defecto`);
      continue;
    }

    try {
      const prompt = `Analizá el siguiente relato delictivo según el Código Penal Argentino: "${relato}". 
      Devolvé ÚNICAMENTE un JSON con estas claves exactas:
      {
        "CALIFICACION LEGAL": "ROBO|HURTO|LESIONES|HOMICIDIO|NINGUNO DE INTERÉS",
        "MODALIDAD": "ASALTO|MOTOCHORRO|ENTRADERA|VIOLENCIA DE GÉNERO|NO ESPECIFICADO",
        "ARMA": "FUEGO|BLANCA|NO ESPECIFICADO",
        "LESIONADA": "SI|NO",
        "VICTIMA": "MASCULINO|FEMENINO|NO ESPECIFICADO",
        "IMPUTADO": "MASCULINO|FEMENINO|NO ESPECIFICADO"
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Limpiar respuesta para extraer JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const clasificacion = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      
      classifiedData.push({ ...row, ...clasificacion });
      logEntries.push(`Fila ${i + 2}: Procesado con IA - ${JSON.stringify(clasificacion)}`);
      
    } catch (error) {
      console.error(`Error procesando fila ${i + 2}:`, error);
      classifiedData.push({
        ...row,
        "CALIFICACION LEGAL": "ERROR",
        "MODALIDAD": "ERROR",
        "ARMA": "ERROR",
        "LESIONADA": "ERROR",
        "VICTIMA": "ERROR",
        "IMPUTADO": "ERROR"
      });
      logEntries.push(`Fila ${i + 2}: ERROR - ${error}`);
    }
  }

  return {
    classifiedData,
    log: logEntries.join('\n')
  };
}

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