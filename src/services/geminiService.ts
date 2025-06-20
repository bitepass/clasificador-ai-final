import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ClasificacionLegal, FilaExcel, ProcessedRowData,
  CLASIFICACION_DEFAULT, VALORES_VALIDOS, EXCEL_OUTPUT_HEADERS,
  IA_CLASSIFICATION_KEYS, DISPLAY_TO_INTERNAL_KEY_MAP
} from '../types';
import { GEMINI_MODEL_NAME, RELATO_COLUMN_KEYWORDS } from '../constants';

// Funciones auxiliares para Excel
export async function readExcelFile(file: File): Promise<FilaExcel[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetName = workbook.SheetNames[0]; // Lee la primera hoja por defecto
  const sheet = workbook.Sheets[sheetName];

  const rawJson: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });

  if (rawJson.length === 0) {
      return []; // Archivo vacío
  }

  const actualHeaders: string[] = rawJson[0].map(h => String(h || '').trim());
  const dataRows = rawJson.slice(1);

  let relatoColumnName: string | undefined;
  for (const header of actualHeaders) {
      const normalizedHeader = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (RELATO_COLUMN_KEYWORDS.some(keyword => normalizedHeader.includes(keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
          relatoColumnName = header;
          break;
      }
  }

  if (!relatoColumnName) {
      console.warn("No se encontró una columna de relato clara. Se intentará usar 'RELATO' si existe, o la primera columna con texto largo.");
      const potentialRelatoColumn = actualHeaders.find(header => {
          const sampleValue = dataRows[0]?.[actualHeaders.indexOf(header)];
          return sampleValue && String(sampleValue).length > 50;
      });
      relatoColumnName = potentialRelatoColumn || actualHeaders[0];
      if (!relatoColumnName) {
          throw new Error("No se pudo identificar una columna de relato en el archivo Excel.");
      }
  }

  const processedJson: FilaExcel[] = dataRows.map(rowArray => {
      const rowObject: FilaExcel = {};
      actualHeaders.forEach((header, index) => {
          const value = rowArray[index];
          rowObject[header] = (value !== null && value !== undefined) ? String(value).trim() : '';
      });
      rowObject.RELATO = String(rowObject[relatoColumnName!] || '').trim();
      return rowObject;
  }).filter(row => Object.values(row).some(value => value));

  return processedJson;
}


async function readBinaryExcelTemplate(file: File): Promise<XLSX.WorkBook> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
  return workbook;
}

function validateAndCleanClassification(
  rawClassification: any,
  logEntries: string[]
): ClasificacionLegal {
  const cleanClassification: ClasificacionLegal = { ...CLASIFICACION_DEFAULT };

  for (const displayKey of IA_CLASSIFICATION_KEYS) {
    const internalKey = DISPLAY_TO_INTERNAL_KEY_MAP[displayKey];
    const rawValue = rawClassification[internalKey || displayKey];

    const validOptions = VALORES_VALIDOS[internalKey || displayKey];

    if (rawValue !== undefined && rawValue !== null && typeof rawValue === 'string') {
      const upperCaseValue = rawValue.toUpperCase().trim();

      if (Array.isArray(validOptions) && validOptions.includes(upperCaseValue)) {
        cleanClassification[displayKey as keyof ClasificacionLegal] = upperCaseValue;
      } else {
        cleanClassification[displayKey as keyof ClasificacionLegal] = CLASIFICACION_DEFAULT[displayKey];
        logEntries.push(`    [!] ADVERTENCIA: Campo "${displayKey}". Valor de IA "${rawValue}" NO VÁLIDO. Usando '${CLASIFICACION_DEFAULT[displayKey]}'.`);
      }
    } else {
      cleanClassification[displayKey as keyof ClasificacionLegal] = CLASIFICACION_DEFAULT[displayKey];
      if (rawValue !== undefined && rawValue !== null) {
        logEntries.push(`    [!] ADVERTENCIA: Campo "${displayKey}". Valor de IA "${rawValue}" (tipo ${typeof rawValue}) NO ES VÁLIDO. Usando '${CLASIFICACION_DEFAULT[displayKey]}'.`);
      }
    }
  }
  return cleanClassification;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


export async function classifyRelatoBatch(genAI: GoogleGenerativeAI, rows: FilaExcel[], templateFile: File | null): Promise<{ classifiedData: ProcessedRowData[]; log: string }> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

  let templateWorkbook: XLSX.WorkBook | null = null;
  let templateSheetName: string | null = null;
  const HEADER_ROW_COUNT = 2;

  if (templateFile) {
    try {
      templateWorkbook = await readBinaryExcelTemplate(templateFile);
      sheetName = templateWorkbook.SheetNames[0];
    } catch (e: any) {
      console.error("Error al leer la plantilla Excel:", e);
    }
  }

  const classifiedData: ProcessedRowData[] = [];
  const logEntries: string[] = [];

  logEntries.push(`=================================================================\n`);
  logEntries.push(`= INICIO DE PROCESAMIENTO CON INTELIGENCIA ARTIFICIAL =\n`);
  logEntries.push(`=================================================================\n`);
  logEntries.push(`Fecha y Hora: ${new Date().toLocaleString()}\n`);
  logEntries.push(`Modelo de IA utilizado: ${GEMINI_MODEL_NAME}\n`);
  logEntries.push(`Total de filas a procesar: ${rows.length}\n`);
  logEntries.push(`Plantilla de Excel cargada: ${templateFile ? templateFile.name : 'No'}\n`);
  logEntries.push(`\n`);

  const REQUESTS_PER_BATCH = 50;
  const DELAY_BETWEEN_BATCHES_MS = 500;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || Object.keys(row).length === 0 || Object.values(row).every(val => !val)) {
      logEntries.push(`\n=== FILA ${i + 2} (ID: ${row?.id_hecho || 'N/A'}) - OMITIDA ===\n`); // Sección más clara
      logEntries.push(`  MOTIVO: Fila vacía o no se pudo leer.\n`);
      logEntries.push(`-----------------------------------------------------------------\n`);
      continue;
    }

    const relato = (row.RELATO || "").toString().trim();

    const finalClassificationForRow: ClasificacionLegal = { ...CLASIFICACION_DEFAULT };

    for (const header of EXCEL_OUTPUT_HEADERS) {
      if (row[header] !== undefined && row[header] !== null) {
        finalClassificationForRow[header as keyof ClasificacionLegal] = String(row[header]).trim();
      } else {
        finalClassificationForRow[header as keyof ClasificacionLegal] = CLASIFICACION_DEFAULT[header];
      }
    }

    finalClassificationForRow["relato"] = relato;

    const baseProcessedRow: ProcessedRowData = {
      originalIndex: i,
      originalRowData: row,
      RELATO_NORMALIZED_VALUE: relato,
      classification: finalClassificationForRow,
      errorMessage: undefined
    };

    logEntries.push(`\n=== PROCESANDO FILA ${i + 2} (ID Original: ${row.id_hecho || 'N/A'}) ===\n`);
    logEntries.push(`  Relato Completo:\n  "${relato}"\n`); // Muestra el relato completo

    if (!relato) {
      classifiedData.push({
        ...baseProcessedRow,
        errorMessage: "Relato vacío, usando valores por defecto."
      });
      logEntries.push(`  >>> RESULTADO: RELATO VACÍO - Clasificación por defecto aplicada. <<<\n`);
      logEntries.push(`  Clasificación Final Generada:\n${JSON.stringify(baseProcessedRow.classification, null, 2)}\n`);
      logEntries.push(`-----------------------------------------------------------------\n`);
      continue;
    }

    try {
      const prompt = `Analiza el siguiente relato delictivo. Identifica la información relevante para las siguientes categorías.
      Tu respuesta debe ser estricta y ÚNICAMENTE un objeto JSON. No incluyas ningún otro texto, markdown, preámbulos o explicaciones fuera del JSON.

      Relato: "${relato}"

      INSTRUCCIONES CLAVE DE CLASIFICACIÓN:
      - Para cada categoría, DEBES seleccionar uno de los valores válidos de la lista proporcionada. Si un valor no se puede determinar con certeza a partir del relato, o el relato no ofrece información para una categoría, DEBES utilizar el valor por defecto "NO ESPECIFICADO" (o "NO" para campos binarios como LESIONADA/TENTATIVA) de la lista de VALORES VÁLIDOS.
      - Los valores deben ser EXACTOS (MAYÚSCULAS y SIN ACENTOS si el valor en la lista no los tiene, o CON ACENTOS si la lista los tiene).
      - Para "CALIFICACION", prioriza el delito principal. Si no es de interés, usa "NINGUNO DE INTERES".
      - Para "ARMAS", si no es de fuego o blanca, y se usó un objeto para dañar, clasifica como "IMPROPIA". Si no se menciona arma o no se usó, usa "NO ESPECIFICADO".
      - Para "LESIONADA", responde "SI" si el relato menciona lesiones/heridas, "NO" en caso contrario.
      - Para "VICTIMA", "IMPUTADO", si hay varios géneros o no se especifica, usa "AMBOS" o "NO ESPECIFICADO" respectivamente.
      - Para "MENOR/MAYOR", busca indicios de edad del imputado. Si no se puede determinar, usa "NO ESPECIFICADO".
      - Para "JURISDICCION" y "LUGAR", intenta extraer del relato los valores más precisos de las listas dadas.
      - Para "TENTATIVA", "SI" si el delito fue intentado pero no consumado, "NO" si fue consumado o no aplica.
      - Para "OBSERVACION" y "FRECUENCIA", usa "NO ESPECIFICADO" a menos que el relato brinde información explícita para una de las opciones válidas.

      LISTA DE VALORES VÁLIDOS POR CAMPO (elige uno EXACTO, en MAYÚSCULAS):
      "CALIFICACION LEGAL": [${VALORES_VALIDOS["CALIFICACION LEGAL"].map(v => `"${v}"`).join(', ')}]
      "MODALIDAD": [${VALORES_VALIDOS["MODALIDAD"].map(v => `"${v}"`).join(', ')}]
      "ARMA": [${VALORES_VALIDOS["ARMA"].map(v => `"${v}"`).join(', ')}]
      "LESIONADA": [${VALORES_VALIDOS["LESIONADA"].map(v => `"${v}"`).join(', ')}]
      "VICTIMA": [${VALORES_VALIDOS["VICTIMA"].map(v => `"${v}"`).join(', ')}]
      "IMPUTADO": [${VALORES_VALIDOS["IMPUTADO"].map(v => `"${v}"`).join(', ')}]
      "MAYOR O MENOR": [${VALORES_VALIDOS["MAYOR O MENOR"].map(v => `"${v}"`).join(', ')}]
      "JURISDICCION": [${VALORES_VALIDOS["JURISDICCION"].map(v => `"${v}"`).join(', ')}]
      "LUGAR": [${VALORES_VALIDOS["LUGAR"].map(v => `"${v}"`).join(', ')}]
      "TENTATIVA": [${VALORES_VALIDOS["TENTATIVA"].map(v => `"${v}"`).join(', ')}]
      "OBSERVACION": [${VALORES_VALIDOS["OBSERVACION"].map(v => `"${v}"`).join(', ')}]
      "FRECUENCIA": [${VALORES_VALIDOS["FRECUENCIA"].map(v => `"${v}"`).join(', ')}]
      `;

      // logEntries.push(`  Prompt enviado a IA:\n${prompt}\n`); // Para depuración, puedes descomentar esto.

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logEntries.push(`  Respuesta Cruda de IA recibida:\n  "${text.replace(/\n/g, '\\n')}"\n`);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let classifiedByIA: any = {};
      let errorParsing = false;

      if (jsonMatch && jsonMatch[0]) {
        try {
          classifiedByIA = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          errorParsing = true;
          console.error(`Error al parsear JSON de la IA para fila ${i + 2}:`, parseError);
          baseProcessedRow.errorMessage = `Error al parsear JSON de IA: ${parseError.message || parseError}`;
        }
      } else {
        errorParsing = true;
        baseProcessedRow.errorMessage = "La IA no devolvió un JSON válido o no se encontró JSON en la respuesta.";
      }

      const validatedIAClassification = validateAndCleanClassification(classifiedByIA, logEntries);

      for (const key of IA_CLASSIFICATION_KEYS) {
          baseProcessedRow.classification[key] = validatedIAClassification[key];
      }
      
      classifiedData.push({
        ...baseProcessedRow,
        errorMessage: errorParsing ? baseProcessedRow.errorMessage : undefined
      });

      logEntries.push(`  >>> RESULTADO: Procesado con IA. <<<\n`);
      logEntries.push(`  Clasificación Final Validada:\n${JSON.stringify(classifiedData[classifiedData.length -1].classification, null, 2)}\n`);
      if (classifiedData[classifiedData.length -1].errorMessage) {
        logEntries.push(`    [!!!] ERROR EN FILA: ${classifiedData[classifiedData.length -1].errorMessage}\n`);
      }
      logEntries.push(`-----------------------------------------------------------------\n`);

    } catch (error: any) {
      console.error(`Error general al procesar fila ${i + 2} con IA:`, error);
      classifiedData.push({
        ...baseProcessedRow,
        classification: {
            ...baseProcessedRow.classification,
            ...CLASIFICACION_DEFAULT
        },
        errorMessage: `Error de IA: ${error.message || error}`
      });
      logEntries.push(`  >>> RESULTADO: ERROR GENERAL DE IA - ${error.message || error} <<<\n`);
      logEntries.push(`  Clasificación Final (Usando solo Originales y Defaults):\n${JSON.stringify(classifiedData[classifiedData.length -1].classification, null, 2)}\n`);
      logEntries.push(`-----------------------------------------------------------------\n`);
    }

    if ((i + 1) % REQUESTS_PER_BATCH === 0 && i < rows.length - 1) {
      logEntries.push(`\n[ PAUSA: Esperando ${DELAY_BETWEEN_BATCHES_MS / 1000} segundos para respetar la cuota de la API. (Después de ${i + 1} filas) ]\n\n`);
      await delay(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  logEntries.push(`\n=================================================================\n`);
  logEntries.push(`= PROCESAMIENTO CON IA FINALIZADO (${classifiedData.length} filas) =\n`);
  logEntries.push(`=================================================================\n`);

  return {
    classifiedData,
    log: logEntries.join('')
  };
}

export async function downloadExcel(data: ProcessedRowData[], filename = "Clasificado IA.xlsx", templateFile: File | null): Promise<void> {
  let workbook: XLSX.WorkBook;
  let sheetName: string;
  let startRow: number;
  const HEADER_ROW_COUNT = 2;

  if (templateFile) {
    try {
      workbook = await readBinaryExcelTemplate(templateFile);
      sheetName = workbook.SheetNames[0];
      startRow = HEADER_ROW_COUNT + 1;
    } catch (e: any) {
      console.error("Error al leer la plantilla Excel para descarga:", e);
      alert("Error al leer la plantilla Excel. Se generará un Excel básico sin formato.");
      workbook = XLSX.utils.book_new();
      sheetName = 'Clasificado';
      startRow = 1;
    }
  } else {
    workbook = XLSX.utils.book_new();
    sheetName = 'Clasificado';
    startRow = 1;
  }

  const currentSheet = workbook.Sheets[sheetName];
  if (!currentSheet) {
    workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet([]);
    const ws = workbook.Sheets[sheetName];
    XLSX.utils.sheet_add_aoa(ws, [EXCEL_OUTPUT_HEADERS], { origin: -1 });
  }

  const dataToAppend = data.map(row => {
    const newRow: { [keyof ClasificacionLegal]: any } = {} as ClasificacionLegal;
    for (const header of EXCEL_OUTPUT_HEADERS) {
      newRow[header] = row.classification[header] !== undefined ? row.classification[header] : '';
    }
    return newRow;
  });

  XLSX.utils.sheet_add_json(workbook.Sheets[sheetName]!, dataToAppend, {
    header: EXCEL_OUTPUT_HEADERS,
    skipHeader: templateFile ? true : false,
    origin: templateFile ? startRow -1 : 0,
    cellDates: true
  });

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), filename);
}

export function downloadLog(logText: string, filename = "Clasificador LOG IA.txt"): Blob {
  return new Blob([logText], { type: 'text/plain;charset=utf-8' });
}