// src/services/excelService.ts
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  ClasificacionLegal, CLASIFICACION_DEFAULT, FilaExcel, ProcessedRowData,
  VALORES_VALIDOS, EXCEL_OUTPUT_HEADERS, IA_CLASSIFICATION_KEYS, CLASSIFICATION_LABELS
} from '../types'; // Importar CLASSIFICATION_LABELS
import { ARTICULOS_CODIGO_PENAL, RELATO_COLUMN_KEYWORDS } from '../constants';
import { readExcelFile as genericReadExcelFile } from './geminiService';

async function readBinaryExcelTemplate(file: File): Promise<XLSX.WorkBook> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
  return workbook;
}

// Función para la lógica de clasificación manual
function interpretarRelato(relato: string, logEntries: string[]): ClasificacionLegal {
  const r = relato.toLowerCase().trim();
  const clasificacion: ClasificacionLegal = { ...CLASIFICACION_DEFAULT };

  // --- ORDEN DE PRIORIDAD EN CALIFICACIÓN (más específico a más general, y negaciones) ---

  // Excepciones primero (para evitar clasificaciones incorrectas por includes())
  if (r.includes("lesiones culposas") || r.includes("lesion culposa") || r.includes("accidente de transito") || r.includes("accidente vial")) {
    clasificacion["CALIFICACIÓN"] = "NINGUNO DE INTERÉS";
    logEntries.push(`    [INFO]: Clasificado como "NINGUNO DE INTERÉS" por ser Lesiones Culposas o accidente de tránsito.`);
    return clasificacion; // Terminar aquí para evitar otras clasificaciones
  }

  // HOMICIDIO
  if (r.includes("homicidio") || r.includes("muerte") || r.includes("fallec") || r.includes("occiso") || r.includes("asesinat")) {
    clasificacion["CALIFICACIÓN"] = "HOMICIDIO";
    if (r.includes("femicidio")) {
      clasificacion["MODALIDAD"] = "FEMICIDIO";
    } else if (r.includes("intrafamiliar") || r.includes("ambito familiar") || r.includes("miembro de familia")) {
      clasificacion["MODALIDAD"] = "INTRAFAMILIAR";
    } else if (r.includes("riña") || r.includes("gresca") || r.includes("pelea mas de dos personas") || r.includes("agresion mas de dos personas")) {
      clasificacion["MODALIDAD"] = "EN RIÑA";
    } else if (r.includes("ocasion de robo") || (r.includes("robo") && r.includes("homicidio")) || (r.includes("sustraccion") && r.includes("homicidio"))) {
      clasificacion["MODALIDAD"] = "EN OCASIÓN DE ROBO";
    } else if (r.includes("ajuste de cuentas") || r.includes("vengar agravio") || r.includes("deuda pendiente")) {
      clasificacion["MODALIDAD"] = "AJUSTE DE CUENTAS";
    } else if (r.includes("enfrentamiento armado") || r.includes("tiroteo") || (r.includes("personal policial") && r.includes("delincuentes"))) {
      clasificacion["MODALIDAD"] = "ENFRENTAMIENTO ARMADO"; // Si es entre policías y delincuentes
    } else {
      clasificacion["MODALIDAD"] = "HOMICIDIO SIMPLE";
    }
  }
  // LESIONES (debe ir antes que Robo/Hurto si pueden superponerse)
  else if (r.includes("lesion") || r.includes("herid") || r.includes("golpe") || r.includes("agred") || r.includes("daño fisico") || r.includes("contusiones")) {
    clasificacion["CALIFICACIÓN"] = "LESIONES";
    clasificacion["LESIONADA"] = "SI";
    if (r.includes("violencia de género") || r.includes("genero") || r.includes("pareja") || r.includes("ex-pareja") || r.includes("intrafamiliar") || r.includes("violencia familiar")) {
      clasificacion["MODALIDAD"] = "VIOLENCIA DE GÉNERO";
    } else {
      clasificacion["MODALIDAD"] = "NO ESPECIFICADO";
    }
  }
  // ROBO y HURTO (distinguir bien por la presencia/ausencia de violencia/fuerza/intimidación)
  else if (r.includes("robo") || r.includes("sustrajo") || r.includes("desapoderamiento") || r.includes("apoderamiento ilegal") || r.includes("sustraccion")) {
      if (r.includes("sin violencia") || r.includes("sin fuerza") || r.includes("sin intimidacion") || r.includes("sin uso de fuerza")) {
          clasificacion["CALIFICACIÓN"] = "HURTO";
      } else {
          clasificacion["CALIFICACIÓN"] = "ROBO";
      }

      // MODALIDADES DE ROBO/HURTO
      if (r.includes("motochorro") || (r.includes("moto") && (r.includes("asalto") || r.includes("robo")))) {
        clasificacion["MODALIDAD"] = "MOTOCHORRO";
      } else if (r.includes("entradera") || (r.includes("domicilio") && r.includes("ingreso") && (r.includes("violencia") || r.includes("sorprenden")))) {
        clasificacion["MODALIDAD"] = "ENTRADERA";
      } else if (r.includes("asalto en finca") || (r.includes("finca") && (r.includes("asalto") || r.includes("robo")))) {
        clasificacion["MODALIDAD"] = "ASALTO EN FINCA"; // ASALTO EN FINCA (agregado)
      } else if (r.includes("asalto en via publica") || (r.includes("via publica") && r.includes("asalto"))) {
        clasificacion["MODALIDAD"] = "ASALTO EN VÍA PÚBLICA"; // ASALTO EN VÍA PÚBLICA (agregado)
      } else if (r.includes("asalto en comercio") || (r.includes("comercio") && r.includes("asalto"))) {
        clasificacion["MODALIDAD"] = "ASALTO EN COMERCIO"; // ASALTO EN COMERCIO (agregado)
      } else if (r.includes("robacables") || r.includes("robo de cables")) {
        clasificacion["MODALIDAD"] = "ROBACABLES";
      } else if (r.includes("robarruedas") || r.includes("robo de ruedas")) {
        clasificacion["MODALIDAD"] = "ROBARRUEDAS";
      } else if (r.includes("rompevidrios") || r.includes("ruptura de cristal") || r.includes("rompio el vidrio")) {
        clasificacion["MODALIDAD"] = "ROMPEVIDRIOS";
      } else if (r.includes("arrebatador") || r.includes("arrebato")) {
        clasificacion["MODALIDAD"] = "ARREBATADOR";
      } else if (r.includes("bicicleta") && (r.includes("robo") || r.includes("hurto") || r.includes("sustraccion"))) {
        clasificacion["MODALIDAD"] = "BICICLETA";
      } else if (r.includes("chofer") || r.includes("repartidor") || r.includes("taxi") || r.includes("aplicacion") || r.includes("delivery")) {
        clasificacion["MODALIDAD"] = "CHOFERES/REPARTIDORES";
      } else if (r.includes("sustraccion automotor") || r.includes("robo de auto") || r.includes("hurto de auto")) {
        clasificacion["MODALIDAD"] = "SUSTRACCION AUTOMOTOR";
      } else if (r.includes("sustraccion motovehiculo") || r.includes("robo de moto") || r.includes("hurto de moto")) {
        clasificacion["MODALIDAD"] = "SUSTRACCION MOTOVEHICULO";
      } else if (r.includes("robo simple") && !(r.includes("arma") || r.includes("intimidacion"))) {
        clasificacion["MODALIDAD"] = "ROBO SIMPLE";
      } else if (r.includes("asalto")) { // Asalto general si no es más específico
        clasificacion["MODALIDAD"] = "ASALTO";
      } else {
        clasificacion["MODALIDAD"] = "NO ESPECIFICADO";
      }
  }
  // DELITOS ABORDADOS RESTANTES (sin prioridad de Homicidio/Lesiones/Robo/Hurto)
  else if (r.includes("usurpacion") || r.includes("toma de terreno") || r.includes("desalojo")) {
    clasificacion["CALIFICACIÓN"] = "USURPACION";
    clasificacion["MODALIDAD"] = "USURPACION"; // Según el instructivo
  } else if (r.includes("abuso sexual")) {
    clasificacion["CALIFICACIÓN"] = "ABUSO SEXUAL";
    if (r.includes("acceso carnal")) {
      clasificacion["MODALIDAD"] = "ABUSO SEXUAL CON ACCESO CARNAL";
    } else {
      clasificacion["MODALIDAD"] = "ABUSO SEXUAL SIMPLE";
    }
  } else if (r.includes("ley 23737") || r.includes("estupefacientes") || r.includes("droga") || r.includes("narcoticos")) {
    clasificacion["CALIFICACIÓN"] = "LEY 23737";
    if (r.includes("comercializacion") || r.includes("venta de droga")) {
      clasificacion["MODALIDAD"] = "COMERCIALIZACION";
    } else if (r.includes("tenencia") || r.includes("poseia droga")) {
      clasificacion["MODALIDAD"] = "TENENCIA";
    } else if (r.includes("consumo") || r.includes("consumia droga")) {
      clasificacion["MODALIDAD"] = "CONSUMO";
    } else if (r.includes("siembra") || r.includes("cultivo")) {
      clasificacion["MODALIDAD"] = "SIEMBRA";
    } else {
      clasificacion["MODALIDAD"] = "NO ESPECIFICADO";
    }
  } else if (r.includes("abigeato") || r.includes("robo de ganado") || r.includes("animales")) {
    clasificacion["CALIFICACIÓN"] = "ABIGEATO";
    clasificacion["MODALIDAD"] = "ABIGEATO";
  } else if (r.includes("estafa")) {
    clasificacion["CALIFICACIÓN"] = "ESTAFAS";
    if (r.includes("marketplace")) {
      clasificacion["MODALIDAD"] = "ESTAFA MARKETPLACE";
    } else if (r.includes("whatsapp")) {
      clasificacion["MODALIDAD"] = "ESTAFA WHATSAPP";
    } else if (r.includes("cuento del tio")) {
      clasificacion["MODALIDAD"] = "ESTAFA CUENTO DEL TIO";
    } else {
      clasificacion["MODALIDAD"] = "ESTAFA OTROS";
    }
  } else if (r.includes("abuso de armas")) {
    clasificacion["CALIFICACIÓN"] = "ABUSO DE ARMAS";
    clasificacion["MODALIDAD"] = "ABUSO DE ARMAS";
  } else if (r.includes("tenencia de armas")) {
    clasificacion["CALIFICACIÓN"] = "TENENCIA DE ARMAS";
    clasificacion["MODALIDAD"] = "TENENCIA DE ARMAS";
  } else if (r.includes("portacion de armas")) {
    clasificacion["CALIFICACIÓN"] = "PORTACION DE ARMAS";
    clasificacion["MODALIDAD"] = "PORTACION DE ARMAS";
  } else if (r.includes("encubrimiento")) {
    clasificacion["CALIFICACIÓN"] = "ENCUBRIMIENTO";
    if (r.includes("via publica")) {
      clasificacion["MODALIDAD"] = "ENCUBRIMIENTO VÍA PÚBLICA";
    } else if (r.includes("taller")) {
      clasificacion["MODALIDAD"] = "ENCUBRIMIENTO TALLER";
    } else if (r.includes("domicilio particular")) {
      clasificacion["MODALIDAD"] = "ENCUBRIMIENTO DOMICILIO PARTICULAR";
    } else {
      clasificacion["MODALIDAD"] = "ENCUBRIMIENTO";
    }
  }
  // Enfrentamientos - Si son una calificación legal separada, agregar aquí.
  else if (r.includes("enfrentamiento") || r.includes("tiroteo") || r.includes("bandas antagonicas")) {
      clasificacion["CALIFICACIÓN"] = "ENFRENTAMIENTOS";
      if (r.includes("ocasion de robo") || (r.includes("robo") && r.includes("enfrentamiento"))) {
        clasificacion["MODALIDAD"] = "EN OCASIÓN DE ROBO";
      } else if (r.includes("ajuste de cuentas")) {
        clasificacion["MODALIDAD"] = "AJUSTE DE CUENTAS";
      } else if (r.includes("procedimiento policial") || (r.includes("policia") && r.includes("delincuentes"))) {
        clasificacion["MODALIDAD"] = "PROCEDIMIENTO POLICIAL";
      } else if (r.includes("riña") || r.includes("gresca")) {
        clasificacion["MODALIDAD"] = "EN RIÑA";
      } else if (r.includes("bandas antagonicas") || r.includes("grupos enfrentados")) {
        clasificacion["MODALIDAD"] = "BANDAS ANTAGÓNICAS";
      } else {
        clasificacion["MODALIDAD"] = "NO ESPECIFICADO";
      }
  }
  // Si no coincide con ninguna calificación principal de interés, asignar "NINGUNO DE INTERÉS"
  else {
    clasificacion["CALIFICACIÓN"] = "NINGUNO DE INTERÉS";
  }


  // --- ARMAS ---
  if (r.includes("arma de fuego") || r.includes("pistola") || r.includes("revólver") || r.includes("disparo") || r.includes("escopeta")) {
    clasificacion["ARMAS"] = "FUEGO";
  } else if (r.includes("arma blanca") || r.includes("cuchillo") || r.includes("navaja") || r.includes("punzon")) {
    clasificacion["ARMAS"] = "BLANCA";
  } else if (r.includes("arma impropia") || r.includes("palo") || r.includes("piedra") || r.includes("botella") || r.includes("fierro") || r.includes("objetos contundentes") || r.includes("a golpes") || r.includes("golpeado con")) {
    clasificacion["ARMAS"] = "IMPROPIA";
  } else {
    clasificacion["ARMAS"] = "NO ESPECIFICADO";
  }

  // --- LESIONADA --- (Si no fue clasificado como LESIONES arriba, se determina aquí)
  if (clasificacion["LESIONADA"] !== "SI" && (r.includes("lesionada") || r.includes("herida") || r.includes("golpeada") || r.includes("agredida") || r.includes("sufrio lesiones"))) {
      clasificacion["LESIONADA"] = "SI";
  } else if (clasificacion["LESIONADA"] !== "SI") {
      clasificacion["LESIONADA"] = "NO";
  }


  // --- VICTIMA/S e IMPUTADOS ---
  const palabrasMasculino = ["masculino", "hombre", "señor", "varon", "individuo", "masculinas", "hombres"];
  const palabrasFemenino = ["femenina", "mujer", "señora", "fémina", "individua", "femeninas", "mujeres"];
  const palabrasPlural = ["varios", "varias", "ambos", "ambos sexos", "personas", "mas de uno", "dos"];

  let victimaSexo: string = "NO ESPECIFICADO";
  const relatoVictimaKeywords = ["victima", "victimas", "damnificado", "damnificada", "damnificados", "damnificadas"];
  const relatoTieneVictimaKeyword = relatoVictimaKeywords.some(kw => r.includes(kw));

  if (relatoTieneVictimaKeyword) {
      const tieneMasculino = palabrasMasculino.some(p => r.includes(p));
      const tieneFemenino = palabrasFemenino.some(p => r.includes(p));
      const esPlural = palabrasPlural.some(p => r.includes(p));

      if (tieneMasculino && tieneFemenino || esPlural) {
        victimaSexo = "AMBOS";
      } else if (tieneMasculino) {
        victimaSexo = "MASCULINO";
      } else if (tieneFemenino) {
        victimaSexo = "FEMENINO";
      }
  }
  clasificacion["VICTIMA/S"] = victimaSexo;

  let imputadoSexo: string = "NO ESPECIFICADO";
  const relatoImputadoKeywords = ["imputado", "imputada", "imputados", "imputadas", "autor", "autora", "autores", "aprehendido", "aprehendida", "aprehendidos"];
  const relatoTieneImputadoKeyword = relatoImputadoKeywords.some(kw => r.includes(kw));

  if (relatoTieneImputadoKeyword) {
      const tieneMasculino = palabrasMasculino.some(p => r.includes(p));
      const tieneFemenino = palabrasFemenino.some(p => r.includes(p));
      const esPlural = palabrasPlural.some(p => r.includes(p));

      if (tieneMasculino && tieneFemenino || esPlural) {
        imputadoSexo = "AMBOS";
      } else if (tieneMasculino) {
        imputadoSexo = "MASCULINO";
      } else if (tieneFemenino) {
        imputadoSexo = "FEMENINO";
      }
  }
  clasificacion["IMPUTADOS"] = imputadoSexo;


  // --- MAYOR O MENOR ---
  if (r.includes("mayor de edad") || r.includes("mayor de 18") || r.includes("adulto") || r.includes("mayor")) {
    clasificacion["MENOR/MAYOR"] = "MAYOR";
  } else if (r.includes("menor de edad") || r.includes("menor de 18") || r.includes("adolescente") || r.includes("niño") || r.includes("menor")) {
    clasificacion["MENOR/MAYOR"] = "MENOR";
  } else {
    clasificacion["MENOR/MAYOR"] = "NO ESPECIFICADO";
  }

  // --- JURISDICCIÓN --- (Esta es la más difícil con reglas. Revisa las palabras clave con cuidado)
  const jurisdicciones = VALORES_VALIDOS["JURISDICCION"];
  let jurisdiccionEncontrada = "NO ESPECIFICADO";
  for (const j of jurisdicciones) {
    const normalizedJ = j.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (r.includes(normalizedJ) || r.includes(j.toLowerCase())) {
      jurisdiccionEncontrada = j;
      break;
    }
  }
  clasificacion["JURISDICCIÓN"] = jurisdiccionEncontrada;


  // --- LUGAR ---
  const lugares = VALORES_VALIDOS["LUGAR"];
  let lugarEncontrado = "NO ESPECIFICADO";
  for (const l of lugares) {
    const normalizedL = l.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("vía pública", "via publica").replace("transporte público", "transporte publico");
    if (r.includes(normalizedL) || r.includes(l.toLowerCase())) {
      lugarEncontrado = l;
      break;
    }
  }
  clasificacion["LUGAR"] = lugarEncontrado;

  // --- TENTATIVA ---
  if (r.includes("intento de") || r.includes("tentativa de") || (r.includes("no logró") && (r.includes("robar") || r.includes("hurtar" || "concretar"))) || r.includes("fracaso el ilicito") || r.includes("no se consumó")) {
    clasificacion["TENTATIVA"] = "SI";
  } else {
    clasificacion["TENTATIVA"] = "NO";
  }

  // --- OBSERVACIÓN y FRECUENCIA ---
  clasificacion["OBSERVACIÓN"] = "NO ESPECIFICADO";
  clasificacion["FRECUENCIA"] = "NO ESPECIFICADO";


  // Validar y limpiar la clasificación final con VALORES_VALIDOS para el LOG y salida
  const validatedClasificacion: ClasificacionLegal = { ...CLASIFICACION_DEFAULT };
  for (const displayKey of IA_CLASSIFICATION_KEYS) {
    const value = clasificacion[displayKey];
    const validOptions = VALORES_VALIDOS[displayKey];

    if (Array.isArray(validOptions) && validOptions.includes(value)) {
      validatedClasificacion[displayKey] = value;
    } else {
      validatedClasificacion[displayKey] = CLASIFICACION_DEFAULT[displayKey];
      if (value !== CLASIFICACION_DEFAULT[displayKey]) {
        logEntries.push(`    [!] ADVERTENCIA (Lógica Local): Campo "${displayKey}". Valor "${value}" NO VÁLIDO o no encontrado en lista. Usando '${CLASIFICACION_DEFAULT[displayKey]}'.`);
      }
    }
  }

  return validatedClasificacion;
}

export async function procesarExcel(dataFile: File, templateFile: File | null): Promise<void> {
  let workbook: XLSX.WorkBook;
  let sheetName: string;
  let startRow: number;
  const HEADER_ROW_COUNT = 2; // Asumo que las dos primeras filas de la plantilla son encabezados

  if (templateFile) {
    try {
      workbook = await readBinaryExcelTemplate(templateFile);
      sheetName = workbook.SheetNames[0];
      startRow = HEADER_ROW_COUNT + 1;
    } catch (e: any) {
      console.error("Error al leer la plantilla Excel para lógica local:", e);
      alert("Error al leer la plantilla Excel. Se generará un Excel básico sin formato.");
      workbook = XLSX.utils.book_new();
      sheetName = 'Clasificado Legal Local';
      startRow = 1;
    }
  } else {
    workbook = XLSX.utils.book_new();
    sheetName = 'Clasificado Legal Local';
    startRow = 1;
  }

  const json: FilaExcel[] = await genericReadExcelFile(dataFile);
  
  const resultados: ProcessedRowData[] = [];
  const logEntries: string[] = [];

  logEntries.push(`=================================================================\n`);
  logEntries.push(`= INICIO DE PROCESAMIENTO CON LÓGICA LOCAL =\n`);
  logEntries.push(`=================================================================\n`);
  logEntries.push(`Fecha y Hora: ${new Date().toLocaleString()}\n`);
  logEntries.push(`Total de filas a procesar: ${json.length}\n`);
  logEntries.push(`Plantilla de Excel cargada: ${templateFile ? templateFile.name : 'No'}\n`);
  logEntries.push(`\n`);


  json.forEach((row: FilaExcel, index: number) => {
    if (!row || Object.keys(row).length === 0 || Object.values(row).every(val => !val)) {
      logEntries.push(`\n### FILA ${index + 2} (ID: ${row?.id_hecho || 'N/A'}) - OMITIDA ###\n`);
      logEntries.push(`  MOTIVO: Fila vacía o no se pudo leer.\n`);
      logEntries.push(`-----------------------------------------------------------------\n\n`);
      return;
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
      originalIndex: index,
      originalRowData: row,
      RELATO_NORMALIZED_VALUE: relato,
      classification: finalClassificationForRow,
      errorMessage: undefined
    };
    
    logEntries.push(`\n--- PROCESANDO FILA ${index + 2} (ID Original: ${row.id_hecho || 'N/A'}) ---\n`);
    logEntries.push(`  Relato Original (Extracto): "${relato.substring(0, 150)}${relato.length > 150 ? '...' : ''}"\n`);

    if (!relato) {
      resultados.push({
        ...baseProcessedRow,
        errorMessage: "Relato vacío, usando valores por defecto."
      });
      logEntries.push(`  >>> RESULTADO: RELATO VACÍO - Clasificación por defecto aplicada. <<<\n`);
      logEntries.push(`  Resumen Clasificación: ${baseProcessedRow.classification["CALIFICACIÓN"]} / ${baseProcessedRow.classification["MODALIDAD"]}\n`);
      logEntries.push(`  Clasificación Completa:\n${JSON.stringify(baseProcessedRow.classification, null, 2)}\n`);
      logEntries.push(`-----------------------------------------------------------------\n`);
      return;
    }

    const clasificacionGenerada = interpretarRelato(relato, logEntries);
    
    for (const key of IA_CLASSIFICATION_KEYS) {
        baseProcessedRow.classification[key] = clasificacionGenerada[key];
    }

    resultados.push({
      ...baseProcessedRow,
      classification: baseProcessedRow.classification
    });
    
    logEntries.push(`  >>> RESULTADO: Procesado con Lógica Local. <<<\n`);
    logEntries.push(`  Resumen Clasificación: ${resultados[resultados.length -1].classification["CALIFICACIÓN"]} / ${resultados[resultados.length -1].classification["MODALIDAD"]}\n`);
    logEntries.push(`  Clasificación Completa:\n${JSON.stringify(resultados[resultados.length -1].classification, null, 2)}\n`);
    if (baseProcessedRow.errorMessage) {
      logEntries.push(`    [!] ERROR: ${baseProcessedRow.errorMessage}\n`);
    }
    logEntries.push(`-----------------------------------------------------------------\n`);
  });

  const currentSheet = workbook.Sheets[sheetName];
  if (!currentSheet) {
    workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet([]);
    const ws = workbook.Sheets[sheetName];
    XLSX.utils.sheet_add_aoa(ws, [EXCEL_OUTPUT_HEADERS], { origin: -1 });
  }

  const dataToAppend = resultados.map(row => {
    const newRow: { [key: string]: any } = {};
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
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `San Martín 2025 - Clasificado Local ${new Date().getTime()}.xlsx`);

  const logBlob = new Blob([logEntries.join('')], { type: 'text/plain;charset=utf-8' });
  saveAs(logBlob, `San Martín 2025 - Clasificador LOG Local ${new Date().getTime()}.txt`);

  console.log(`Procesamiento completado con lógica local: ${resultados.length} filas clasificadas`);
  logEntries.push(`\n=================================================================\n`);
  logEntries.push(`= PROCESAMIENTO CON LÓGICA LOCAL FINALIZADO (${resultados.length} filas) =\n`);
  logEntries.push(`=================================================================\n`);
}