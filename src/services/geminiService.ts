// src/services/geminiService.ts

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  ClasificacionLegal, FilaExcel, ProcessedData,
  VALORES_VALIDOS, EXCEL_OUTPUT_HEADERS
} from '../types';
import { RELATO_COLUMN_KEYWORDS } from '../constants';

// --- Funciones para leer el archivo Excel ---

async function readExcelFile(file: File): Promise<FilaExcel[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawJson: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });

  if (rawJson.length === 0) {
    return [];
  }

  const actualHeaders: string[] = rawJson[0].map(h => String(h || '').trim());
  const dataRows = rawJson.slice(1);

  let relatoColumnName: string | undefined;
  for (const header of actualHeaders) {
    const normalizedHeader = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (RELATO_COLUMN_KEYWORDS.some(keyword => normalizedHeader.includes(keyword))) {
      relatoColumnName = header;
      break;
    }
  }

  if (!relatoColumnName) {
    throw new Error('No se encontró una columna de relato con las palabras clave esperadas.');
  }

  return dataRows.map((rowArray, index) => {
    const rowObject: { [key: string]: any } = {};
    actualHeaders.forEach((header, i) => {
      rowObject[header] = rowArray[i];
    });

    return {
      original: rowObject,
      relato: String(rowObject[relatoColumnName!] || ''),
      rowNumber: index + 2
    };
  });
}

// --- Función principal para procesar el archivo (Aquí está el cambio) ---

export const processFile = async (file: File): Promise<ProcessedData[]> => {
  const excelData = await readExcelFile(file);

  const formData = new FormData();
  formData.append('file', file);

  // ¡CAMBIO AQUÍ! Se usa una ruta relativa para que el proxy de Vite funcione.
  const response = await fetch('/api/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al procesar el archivo en el backend.');
  }

  const results: { row_number: number, classification: ClasificacionLegal }[] = await response.json();

  return excelData.map(originalRow => {
    const result = results.find(r => r.row_number === originalRow.rowNumber);
    return {
      originalData: originalRow.original,
      classification: result ? result.classification : {},
      rowNumber: originalRow.rowNumber,
      isValid: result ? Object.values(result.classification).every(val => val !== null && val !== '') : false,
    };
  });
};


// --- Funciones para exportar los resultados a un nuevo Excel ---

async function readBinaryExcelTemplate(path: string): Promise<ArrayBuffer> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la plantilla de Excel desde ${path}`);
  }
  return response.arrayBuffer();
}

export async function exportToExcel(data: ProcessedData[], templateFile: string | null): Promise<void> {
  let workbook: XLSX.WorkBook;
  let sheetName: string;
  let startRow: number;
  let EXCEL_COLUMN_ORDER: string[] = EXCEL_OUTPUT_HEADERS;

  if (templateFile) {
    try {
      const templateData = await readBinaryExcelTemplate(templateFile);
      workbook = XLSX.read(templateData, { type: 'binary', cellStyles: true });
      sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const headers: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
      EXCEL_COLUMN_ORDER = headers.map(h => String(h).trim());

      const range = XLSX.utils.decode_range(worksheet['!ref']!);
      startRow = range.e.r + 2;

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
    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, [EXCEL_COLUMN_ORDER], { origin: 'A1' });
    workbook.SheetNames.push(sheetName);
    workbook.Sheets[sheetName] = ws;
  }

  const dataToAppend = data.map(row => {
    let newRow: { [key: string]: any } = {};
    for (const header of EXCEL_COLUMN_ORDER) {
      newRow[header] = row.classification[header as keyof ClasificacionLegal] ?? row.originalData[header] ?? '';
    }
    return newRow;
  });

  const origin = templateFile ? startRow - 1 : -1;
  XLSX.utils.sheet_add_json(workbook.Sheets[sheetName]!, dataToAppend, {
    header: EXCEL_COLUMN_ORDER,
    skipHeader: true,
    origin: origin,
  });

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });

  function s2ab(s: string) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  }

  saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), "clasificacion_legal.xlsx");
}