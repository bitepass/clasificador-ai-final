import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ClasificacionLegal, FilaExcel, ProcessedRowData,
  CLASIFICACION_DEFAULT, VALORES_VALIDOS, EXCEL_OUTPUT_HEADERS,
  IA_CLASSIFICATION_KEYS
} from '../types';
import { GEMINI_MODEL_NAME } from '../constants';

// Función para leer el archivo Excel y convertirlo a JSON
export async function processExcel(file: File): Promise<FilaExcel[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<FilaExcel>(sheet);
  return json;
}

// Función para validar y limpiar la respuesta de la IA
// Asegura que solo se usen valores válidos de nuestras listas
function validateAndCleanClassification(
  rawClassification: any // La respuesta JSON parseada de la IA
): ClasificacionLegal {
  const cleanClassification: ClasificacionLegal = { ...CLASIFICACION_DEFAULT }; // Iniciar con valores por defecto

  // Iterar solo sobre las claves que la IA debería clasificar
  for (const key of IA_CLASSIFICATION_KEYS) {
    const rawValue = rawClassification[key];
    const validOptions = VALORES_VALIDOS[key]; // Obtener las opciones válidas para esta clave

    if (rawValue !== undefined && typeof rawValue === 'string') {
      const upperCaseValue = rawValue.toUpperCase().trim();

      // Si hay opciones válidas definidas y el valor de la IA está entre ellas
      if (Array.isArray(validOptions) && validOptions.includes(upperCaseValue)) {
        cleanClassification[key] = upperCaseValue;
      } else {
        // Si el valor de la IA NO es válido para una lista predefinida, usar el valor por defecto
        cleanClassification[key] = CLASIFICACION_DEFAULT[key];
      }
    } else {
      // Si el valor no está presente o no es un string, usar el valor por defecto
      cleanClassification[key] = CLASIFICACION_DEFAULT[key];
    }
  }
  return cleanClassification;
}


export async function classifyRelatoBatch(genAI: GoogleGenerativeAI, rows: FilaExcel[]): Promise<{ classifiedData: ProcessedRowData[]; log: string }> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

  const classifiedData: ProcessedRowData[] = [];
  const logEntries: string[] = [`CLASIFICADOR DE DELITOS - LOG GENERADO: ${new Date().toLocaleString()}\n`];
  logEntries.push(`Modelo de IA utilizado: ${GEMINI_MODEL_NAME}\n`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Se intenta obtener el relato de varias columnas posibles y se normaliza
    const relato = (row.relato || row.RELATO || row["RELATO ORIGINAL"] || "").toString().trim(); // Añadí "RELATO ORIGINAL" por si acaso

    // Iniciar con un objeto que combine datos originales y clasificación por defecto
    const initialClassification: ClasificacionLegal = { ...CLASIFICACION_DEFAULT };
    // Rellenar los campos de la clasificación que provienen directamente del Excel original
    for (const header of EXCEL_OUTPUT_HEADERS) {
        if (!IA_CLASSIFICATION_KEYS.includes(header as keyof ClasificacionLegal)) {
            // Si la columna existe en la fila original, la copiamos
            if (row[header] !== undefined) {
                initialClassification[header] = row[header].toString();
            }
            // El relato original es especial, ya lo normalizamos arriba
            if (header === "RELATO") {
                initialClassification["RELATO"] = relato;
            }
        }
    }

    const baseProcessedRow: ProcessedRowData = {
      originalIndex: i,
      originalRowData: row, // Guardar la fila original completa
      RELATO_NORMALIZED_VALUE: relato,
      classification: initialClassification, // Esta clasificación ya tiene los datos originales y defaults
      errorMessage: undefined
    };

    if (!relato) {
      classifiedData.push({
        ...baseProcessedRow,
        errorMessage: "Relato vacío, usando valores por defecto."
      });
      logEntries.push(`Fila ${i + 2}: RELATO VACÍO - Clasificación por defecto aplicada.\n`);
      logEntries.push(`Output: ${JSON.stringify(baseProcessedRow.classification, null, 2)}\n`);
      continue;
    }

    try {
      // Construcción del PROMPT MEJORADA con opciones exactas y formato estricto
      const prompt = `Analiza el siguiente relato delictivo. Identifica la información relevante para las siguientes categorías.
      Tu respuesta debe ser estricta y ÚNICAMENTE un objeto JSON. No incluyas ningún otro texto, markdown, preámbulos o explicaciones fuera del JSON.

      Relato: "${relato}"

      INSTRUCCIONES CLAVE DE CLASIFICACIÓN Y VALORES VÁLIDOS (elige uno EXACTO, en MAYÚSCULAS):
      - Si un valor no se puede determinar con certeza a partir del relato, o no coincide con ninguna opción válida, DEBES utilizar el valor por defecto "NO ESPECIFICADO" (o "NO" para campos binarios como LESIONADA/TENTATIVA) de la lista de VALORES VÁLIDOS.

      {
        "CALIFICACION LEGAL": "[${VALORES_VALIDOS["CALIFICACION LEGAL"].map(v => `"${v}"`).join('|')}]",
        "MODALIDAD": "[${VALORES_VALIDOS["MODALIDAD"].map(v => `"${v}"`).join('|')}]",
        "ARMA": "[${VALORES_VALIDOS["ARMA"].map(v => `"${v}"`).join('|')}]",
        "LESIONADA": "[${VALORES_VALIDOS["LESIONADA"].map(v => `"${v}"`).join('|')}]",
        "VICTIMA": "[${VALORES_VALIDOS["VICTIMA"].map(v => `"${v}"`).join('|')}]",
        "IMPUTADO": "[${VALORES_VALIDOS["IMPUTADO"].map(v => `"${v}"`).join('|')}]",
        "MAYOR O MENOR": "[${VALORES_VALIDOS["MAYOR O MENOR"].map(v => `"${v}"`).join('|')}]",
        "JURISDICCION": "[${VALORES_VALIDOS["JURISDICCION"].map(v => `"${v}"`).join('|')}]",
        "LUGAR": "[${VALORES_VALIDOS["LUGAR"].map(v => `"${v}"`).join('|')}]",
        "TENTATIVA": "[${VALORES_VALIDOS["TENTATIVA"].map(v => `"${v}"`).join('|')}]",
        "OBSERVACION": "[${VALORES_VALIDOS["OBSERVACION"].map(v => `"${v}"`).join('|')}]",
        "FRECUENCIA": "[${VALORES_VALIDOS["FRECUENCIA"].map(v => `"${v}"`).join('|')}]"
      }
      `; // Fin del prompt

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let classifiedByIA: ClasificacionLegal = { ...CLASIFICACION_DEFAULT }; // Esto es lo que la IA devuelve
      let errorParsing = false;

      if (jsonMatch && jsonMatch[0]) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          classifiedByIA = validateAndCleanClassification(parsed); // Validar la salida de la IA
        } catch (parseError) {
          errorParsing = true;
          console.error(`Error al parsear JSON de la IA para fila ${i + 2}:`, parseError);
          baseProcessedRow.errorMessage = `Error al parsear JSON de IA: ${parseError}`;
        }
      } else {
        errorParsing = true;
        baseProcessedRow.errorMessage = "La IA no devolvió un JSON válido o no se encontró JSON en la respuesta.";
      }

      // Combinar los datos originales del Excel con la clasificación validada de la IA
      // La baseProcessedRow.classification ya tiene los datos originales y defaults
      // Ahora sobrescribimos los campos que clasifica la IA con lo que la IA devolvió (validado).
      const finalClassificationResult: ClasificacionLegal = {
          ...baseProcessedRow.classification, // Mantiene los datos originales del Excel y los defaults
          ...classifiedByIA // Sobrescribe con los resultados de la IA (ya validados)
      };

      classifiedData.push({
        ...baseProcessedRow,
        classification: finalClassificationResult, // Usamos el resultado combinado
        errorMessage: errorParsing ? baseProcessedRow.errorMessage : undefined
      });

      logEntries.push(`Fila ${i + 2}: Procesado con IA`);
      logEntries.push(`Relato: "${relato}"`);
      logEntries.push(`Respuesta cruda de IA: "${text.replace(/\n/g, '\\n')}"`);
      logEntries.push(`Clasificación final (IA + Originales): ${JSON.stringify(finalClassificationResult, null, 2)}`);
      if (classifiedData[classifiedData.length -1].errorMessage) {
        logEntries.push(`ATENCIÓN: ${classifiedData[classifiedData.length -1].errorMessage}`);
      }
      logEntries.push('---\n');

    } catch (error: any) {
      console.error(`Error general al procesar fila ${i + 2} con IA:`, error);
      classifiedData.push({
        ...baseProcessedRow,
        classification: { ...CLASIFICACION_DEFAULT }, // En caso de error, usar solo los defaults
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

// Función para descargar el Excel clasificado
export function downloadExcel(data: ProcessedRowData[], filename = "Clasificado IA.xlsx"): Blob {
  // Mapear los datos clasificados para que coincidan con los encabezados de salida del Excel
  const dataToExport = data.map(row => {
    const newRow: { [key: string]: any } = {};
    for (const header of EXCEL_OUTPUT_HEADERS) {
      // Priorizamos los valores de la propiedad 'classification' (que ya incluye IA + originales)
      // Asegúrate de que todos los campos en EXCEL_OUTPUT_HEADERS estén presentes en ClasificacionLegal
      newRow[header] = row.classification[header] !== undefined ? row.classification[header] : '';
    }
    return newRow;
  });

  const newSheet = XLSX.utils.json_to_sheet(dataToExport, { header: EXCEL_OUTPUT_HEADERS });
  const newWB = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWB, newSheet, 'Clasificado');
  const wbout = XLSX.write(newWB, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/octet-stream' });
}

// Función para descargar el Log
export function downloadLog(logText: string, filename = "Clasificador IA LOG.txt"): Blob {
  return new Blob([logText], { type: 'text/plain;charset=utf-8' });
}