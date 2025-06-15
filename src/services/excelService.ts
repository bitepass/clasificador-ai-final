import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ClasificacionLegal, CLASIFICACION_DEFAULT, FilaExcel, FilaClasificada } from '../types';
import { ARTICULOS_CODIGO_PENAL } from '../constants';

function interpretarRelato(relato: string): [ClasificacionLegal, string] {
  const r = relato.toLowerCase().trim();
  const clasificacion: ClasificacionLegal = { ...CLASIFICACION_DEFAULT };
  let interpretacion = "No se detectó figura penal clara.";

  // Lógica de clasificación mejorada
  if (r.includes("robo") || r.includes("sustrajo") || r.includes("asalt")) {
    clasificacion["CALIFICACION LEGAL"] = "ROBO";
    
    if (r.includes("moto") || r.includes("motochorro")) {
      clasificacion["MODALIDAD"] = "MOTOCHORRO";
    } else if (r.includes("casa") || r.includes("domicilio") || r.includes("entr")) {
      clasificacion["MODALIDAD"] = "ENTRADERA";
    } else {
      clasificacion["MODALIDAD"] = "ASALTO";
    }
    
    if (r.includes("arma") || r.includes("fuego") || r.includes("pistola") || r.includes("revólver")) {
      clasificacion["ARMA"] = "FUEGO";
      interpretacion = `Robo calificado por arma de fuego (Código Penal, ${ARTICULOS_CODIGO_PENAL.ROBO}).`;
    } else if (r.includes("cuchillo") || r.includes("navaja") || r.includes("blanca")) {
      clasificacion["ARMA"] = "BLANCA";
      interpretacion = `Robo calificado por arma blanca (Código Penal, ${ARTICULOS_CODIGO_PENAL.ROBO}).`;
    } else {
      interpretacion = `Robo simple (Código Penal, ${ARTICULOS_CODIGO_PENAL.ROBO}).`;
    }
  } 
  else if (r.includes("lesion") || r.includes("herid") || r.includes("golpe") || r.includes("agred")) {
    clasificacion["CALIFICACION LEGAL"] = "LESIONES";
    clasificacion["LESIONADA"] = "SI";
    
    if (r.includes("cuchillo") || r.includes("navaja")) {
      clasificacion["ARMA"] = "BLANCA";
    }
    if (r.includes("pareja") || r.includes("violencia") || r.includes("género")) {
      clasificacion["MODALIDAD"] = "VIOLENCIA DE GÉNERO";
    }
    
    interpretacion = `Lesiones dolosas (Código Penal, ${ARTICULOS_CODIGO_PENAL.LESIONES}).`;
  }
  else if (r.includes("homicidio") || r.includes("cadáver") || r.includes("muerte") || r.includes("asesin")) {
    clasificacion["CALIFICACION LEGAL"] = "HOMICIDIO";
    
    if (r.includes("disparo") || r.includes("bala") || r.includes("fuego")) {
      clasificacion["ARMA"] = "FUEGO";
    }
    
    interpretacion = `Homicidio (Código Penal, ${ARTICULOS_CODIGO_PENAL.HOMICIDIO}).`;
  }
  else if (r.includes("hurto") || r.includes("sustrae")) {
    clasificacion["CALIFICACION LEGAL"] = "HURTO";
    interpretacion = `Hurto (Código Penal, ${ARTICULOS_CODIGO_PENAL.HURTO}).`;
  }

  // Determinar género víctima/imputado
  if (r.includes("femenina") || r.includes("mujer") || r.includes("señora")) {
    clasificacion["VICTIMA"] = "FEMENINO";
  } else if (r.includes("masculino") || r.includes("hombre") || r.includes("señor")) { 
    clasificacion["VICTIMA"] = "MASCULINO";
  }

  if (r.includes("imputado") || r.includes("sospechoso")) {
    if (r.includes("hombre") || r.includes("masculino")) {
      clasificacion["IMPUTADO"] = "MASCULINO";
    } else if (r.includes("mujer") || r.includes("femenina")) {
      clasificacion["IMPUTADO"] = "FEMENINO";
    }
  }

  return [clasificacion, interpretacion];
}

export async function procesarExcel(file: File): Promise<void> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json: FilaExcel[] = XLSX.utils.sheet_to_json<FilaExcel>(sheet);

    const resultados: FilaClasificada[] = [];
    const log: string[] = [`CLASIFICADOR DE DELITOS - LOG GENERADO: ${new Date().toLocaleString()}\n`];

    json.forEach((row: FilaExcel, index: number) => {
      const relato = row.relato || row.RELATO || "";
      
      if (!relato.trim()) {
        const filaDefault: FilaClasificada = { 
          ...row, 
          ...CLASIFICACION_DEFAULT,
          indiceOriginal: index + 2,
          error: "Relato vacío"
        };
        resultados.push(filaDefault);
        log.push(`Fila ${index + 2}: RELATO VACÍO - Clasificación por defecto aplicada.\n`);
        return;
      }

      const [clasificacion, interpretacion] = interpretarRelato(relato);
      
      const filaClasificada: FilaClasificada = {
        ...row,
        ...clasificacion,
        indiceOriginal: index + 2
      };
      
      resultados.push(filaClasificada);
      
      log.push(`Fila ${index + 2}:`);
      log.push(`Relato: "${relato}"`);
      log.push(`Interpretación Legal: ${interpretacion}`);
      log.push(`Clasificación: ${JSON.stringify(clasificacion, null, 2)}`);
      log.push('---\n');
    });

    // Generar Excel
    const newSheet = XLSX.utils.json_to_sheet(resultados);
    const newWB = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWB, newSheet, 'Clasificado');
    const wbout = XLSX.write(newWB, { bookType: 'xlsx', type: 'array' });

    // Descargar archivos
    const excelBlob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(excelBlob, 'San Martín 2025 - Clasificado.xlsx');

    const logBlob = new Blob([log.join('\n')], { type: 'text/plain;charset=utf-8' });
    saveAs(logBlob, 'San Martín 2025 - Clasificador LOG.txt');

    console.log(`Procesamiento completado: ${resultados.length} filas clasificadas`);
    
  } catch (error) {
    console.error('Error en procesarExcel:', error);
    throw new Error(`Error al procesar el archivo: ${error}`);
  }
}