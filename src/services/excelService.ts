import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  ClasificacionLegal, CLASIFICACION_DEFAULT, FilaExcel, ProcessedRowData,
  VALORES_VALIDOS, EXCEL_OUTPUT_HEADERS // Importar EXCEL_OUTPUT_HEADERS
} from '../types';
import { ARTICULOS_CODIGO_PENAL } from '../constants';

// Función para la lógica de clasificación manual
function interpretarRelato(relato: string): ClasificacionLegal {
  const r = relato.toLowerCase().trim();
  const clasificacion: ClasificacionLegal = { ...CLASIFICACION_DEFAULT };
  // Interpretación legal aquí (solo los campos que procesas manualmente)
  // Asegúrate de que los valores que asignes aquí coincidan con VALORES_VALIDOS

  if (r.includes("robo") || r.includes("sustrajo") || r.includes("asalt")) {
    clasificacion["CALIFICACION LEGAL"] = "ROBO";
    
    if (r.includes("moto") || r.includes("motochorro")) {
      clasificacion["MODALIDAD"] = "MOTOCHORRO";
    } else if (r.includes("casa") || r.includes("domicilio") || r.includes("entr")) {
      clasificacion["MODALIDAD"] = "ENTRADERA";
    } else {
      clasificacion["MODALIDAD"] = "ASALTO";
    }
    
    if (r.includes("arma de fuego") || r.includes("fuego") || r.includes("pistola") || r.includes("revólver")) {
      clasificacion["ARMA"] = "FUEGO";
    } else if (r.includes("arma blanca") || r.includes("cuchillo") || r.includes("navaja") || r.includes("blanca")) {
      clasificacion["ARMA"] = "BLANCA";
    } else if (r.includes("impropia") || r.includes("palo") || r.includes("piedra") || r.includes("botella")) { // Ejemplo para arma impropia
      clasificacion["ARMA"] = "IMPROPIA";
    } else {
      clasificacion["ARMA"] = "NO ESPECIFICADO";
    }
  } 
  else if (r.includes("lesion") || r.includes("herid") || r.includes("golpe") || r.includes("agred")) {
    clasificacion["CALIFICACION LEGAL"] = "LESIONES";
    clasificacion["LESIONADA"] = "SI";
    
    if (r.includes("violencia de género") || r.includes("género") || r.includes("pareja")) {
      clasificacion["MODALIDAD"] = "VIOLENCIA DE GÉNERO";
    } else {
      clasificacion["MODALIDAD"] = "NO ESPECIFICADO"; // Asegurar que siempre haya un valor válido
    }

    // Aquí puedes añadir más lógica para ARMA en caso de LESIONES si es relevante
    if (r.includes("cuchillo") || r.includes("navaja")) {
      clasificacion["ARMA"] = "BLANCA";
    } else if (r.includes("arma de fuego") || r.includes("fuego")) {
      clasificacion["ARMA"] = "FUEGO";
    } else if (r.includes("impropia") || r.includes("palo") || r.includes("piedra")) {
      clasificacion["ARMA"] = "IMPROPIA";
    } else {
      clasificacion["ARMA"] = "NO ESPECIFICADO";
    }

  }
  else if (r.includes("homicidio") || r.includes("cadáver") || r.includes("muerte") || r.includes("asesin")) {
    clasificacion["CALIFICACION LEGAL"] = "HOMICIDIO";
    
    if (r.includes("disparo") || r.includes("bala") || r.includes("fuego")) {
      clasificacion["ARMA"] = "FUEGO";
    } else if (r.includes("blanca") || r.includes("cuchillo")) {
      clasificacion["ARMA"] = "BLANCA";
    } else if (r.includes("impropia")) {
      clasificacion["ARMA"] = "IMPROPIA";
    } else {
      clasificacion["ARMA"] = "NO ESPECIFICADO";
    }
    // Lógica para modalidades de homicidio si aplica
    if (r.includes("femicidio") || r.includes("mujer por genero")) {
      clasificacion["MODALIDAD"] = "FEMICIDIO";
    } else {
      clasificacion["MODALIDAD"] = "HOMICIDIO SIMPLE"; // Default si no se especifica
    }
  }
  else if (r.includes("hurto") || r.includes("sustrae") && !r.includes("arma")) {
    clasificacion["CALIFICACION LEGAL"] = "HURTO";
    clasificacion["MODALIDAD"] = "NO ESPECIFICADO"; // Por defecto
  }
  // Más lógica para otras calificaciones legales y modalidades (USURPACION, LEY 23737, etc.)

  // Determinar género víctima/imputado
  if (r.includes("femenina") || r.includes("mujer") || r.includes("señora")) {
    if (r.includes("víctima") || r.includes("damnificada")) { clasificacion["VICTIMA"] = "FEMENINO"; }
    if (r.includes("imputada") || r.includes("autora")) { clasificacion["IMPUTADO"] = "FEMENINO"; }
  } else if (r.includes("masculino") || r.includes("hombre") || r.includes("señor")) { 
    if (r.includes("víctima") || r.includes("damnificado")) { clasificacion["VICTIMA"] = "MASCULINO"; }
    if (r.includes("imputado") || r.includes("autor")) { clasificacion["IMPUTADO"] = "MASCULINO"; }
  }
  // Lógica para "AMBOS" si hay plurales como "varias víctimas", "ambos sexos", etc.
  if ((r.includes("masculino") && r.includes("femenina")) || r.includes("ambos sexos") || r.includes("varias personas")) {
    if (r.includes("victima") || r.includes("damnificada")) { clasificacion["VICTIMA"] = "AMBOS"; }
    if (r.includes("imputado") || r.includes("autor")) { clasificacion["IMPUTADO"] = "AMBOS"; }
  }

  // Mayor o Menor
  if (r.includes("mayor de edad") || r.includes("mayor de 18") || r.includes("adulto")) {
    clasificacion["MAYOR O MENOR"] = "MAYOR";
  } else if (r.includes("menor de edad") || r.includes("menor de 18") || r.includes("adolescente") || r.includes("niño")) {
    clasificacion["MAYOR O MENOR"] = "MENOR";
  } else {
    clasificacion["MAYOR O MENOR"] = "NO ESPECIFICADO";
  }

  // Jurisdicción (ejemplo muy básico, idealmente buscar en una lista de municipios)
  if (r.includes("josé c. paz")) { clasificacion["JURISDICCION"] = "JOSÉ C. PAZ"; }
  else if (r.includes("san martín")) { clasificacion["JURISDICCION"] = "SAN MARTIN"; }
  // ... añadir más jurisdicciones ...
  else { clasificacion["JURISDICCION"] = "NO ESPECIFICADO"; }

  // Lugar
  if (r.includes("vía pública") || r.includes("calle")) { clasificacion["LUGAR"] = "VÍA PÚBLICA"; }
  else if (r.includes("comercio") || r.includes("negocio")) { clasificacion["LUGAR"] = "COMERCIO"; }
  // ... añadir más lugares ...
  else { clasificacion["LUGAR"] = "NO ESPECIFICADO"; }

  // Tentativa
  if (r.includes("intento de robo") || r.includes("tentativa de")) { clasificacion["TENTATIVA"] = "SI"; }
  else { clasificacion["TENTATIVA"] = "NO"; }

  // Frecuencia y Observación (asumo NO ESPECIFICADO si no hay lógica para ellos)
  clasificacion["FRECUENCIA"] = "NO ESPECIFICADO";
  clasificacion["OBSERVACION"] = "NO ESPECIFICADO";


  return clasificacion;
}

export async function procesarExcel(file: File): Promise<void> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json: FilaExcel[] = XLSX.utils.sheet_to_json<FilaExcel>(sheet);

    const resultados: ProcessedRowData[] = [];
    const log: string[] = [`CLASIFICADOR DE DELITOS - LOG (LÓGICA LEGAL LOCAL): ${new Date().toLocaleString()}\n`];
    log.push(`\n`); // Espacio para mejor visualización

    json.forEach((row: FilaExcel, index: number) => {
      const relato = (row.relato || row.RELATO || row["RELATO ORIGINAL"] || "").toString().trim();

      // Iniciar con un objeto que combine datos originales y clasificación por defecto
      const initialClassification: ClasificacionLegal = { ...CLASIFICACION_DEFAULT };
      for (const header of EXCEL_OUTPUT_HEADERS) {
          if (row[header] !== undefined) {
              initialClassification[header] = row[header].toString();
          }
          if (header === "RELATO") { // Asegurar que el relato original se copee
              initialClassification["RELATO"] = relato;
          }
      }

      const baseProcessedRow: ProcessedRowData = {
        originalIndex: index,
        originalRowData: row,
        RELATO_NORMALIZED_VALUE: relato,
        classification: initialClassification,
        errorMessage: undefined
      };
      
      if (!relato) {
        resultados.push({
          ...baseProcessedRow,
          errorMessage: "Relato vacío, usando valores por defecto."
        });
        log.push(`Fila ${index + 2}: RELATO VACÍO - Clasificación por defecto aplicada.\n`);
        log.push(`Output: ${JSON.stringify(baseProcessedRow.classification, null, 2)}\n`);
        return;
      }

      const clasificacionGenerada = interpretarRelato(relato);
      
      // Combinar los datos originales del Excel con la clasificación manual generada
      const finalClassificationResult: ClasificacionLegal = {
          ...baseProcessedRow.classification, // Mantiene los datos originales del Excel y los defaults
          ...clasificacionGenerada // Sobrescribe con los resultados de la lógica manual
      };

      resultados.push({
        ...baseProcessedRow,
        classification: finalClassificationResult
      });
      
      log.push(`Fila ${index + 2}:`);
      log.push(`Relato: "${relato}"`);
      log.push(`Clasificación obtenida (Lógica Local): ${JSON.stringify(finalClassificationResult, null, 2)}`);
      log.push('---\n');
    });

    // Generar Excel
    // Mapear los resultados para que coincidan con los encabezados de salida del Excel
    const dataToExport = resultados.map(row => {
      const newRow: { [key: string]: any } = {};
      for (const header of EXCEL_OUTPUT_HEADERS) {
        // Priorizamos los valores de la propiedad 'classification'
        newRow[header] = row.classification[header] !== undefined ? row.classification[header] : '';
      }
      return newRow;
    });

    const newSheet = XLSX.utils.json_to_sheet(dataToExport, { header: EXCEL_OUTPUT_HEADERS });
    const newWB = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWB, newSheet, 'Clasificado');
    const wbout = XLSX.write(newWB, { bookType: 'xlsx', type: 'array' });

    // Descargar archivos
    const excelBlob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(excelBlob, 'San Martín 2025 - Clasificado Local.xlsx');

    const logBlob = new Blob([log.join('\n')], { type: 'text/plain;charset=utf-8' });
    saveAs(logBlob, 'San Martín 2025 - Clasificador LOG Local.txt');

    console.log(`Procesamiento completado con lógica local: ${resultados.length} filas clasificadas`);
    
  } catch (error) {
    console.error('Error en procesarExcel (Lógica Local):', error);
    throw new Error(`Error al procesar el archivo con lógica local: ${error}`);
  }
}