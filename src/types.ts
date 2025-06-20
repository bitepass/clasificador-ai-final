// src/types.ts

export enum AppStep {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS',
}

// Interfaz que representa la estructura final de UNA FILA en el Excel de salida.
// Las claves deben coincidir EXACTAMENTE con los encabezados de DELEGACION.xlsx - Sheet1.csv.
// Las que la IA clasifica son las "violetas", las otras se copian del original.
export interface ClasificacionLegal {
  "id_hecho"?: string; // Columna del Excel original
  "nro_registro"?: string; // Columna del Excel original
  "ipp"?: string; // Columna del Excel original
  "fecha_carga"?: string; // Columna del Excel original
  "hora_carga"?: string; // Columna del Excel original
  "dependencia"?: string; // Columna del Excel original
  "fecha_inicio_hecho"?: string; // Columna del Excel original
  "hora_inicio_hecho"?: string; // Columna del Excel original
  "partido_hecho"?: string; // Columna del Excel original
  "localidad_hecho"?: string; // Columna del Excel original
  "latitud"?: string; // Columna del Excel original
  "calle"?: string; // Columna del Excel original
  "longitud"?: string; // Columna del Excel original
  "altura"?: string; // Columna del Excel original
  "entre"?: string; // Columna del Excel original
  "calificaciones"?: string; // Columna del Excel original (Carátula/Tipo de delito original)
  "relato"?: string; // Columna del Excel original
  "JURISDICCIÓN": string; // Clasificada por IA (con tilde)
  "CALIFICACIÓN": string; // Clasificada por IA (con tilde)
  "MODALIDAD": string; // Clasificada por IA
  "VICTIMA/S": string; // Clasificada por IA (con /S)
  "NO": string; // Columna "NO" entre Victima/Imputado en DELEGACION.xlsx, se copiará vacía o un guión.
  "IMPUTADOS": string; // Clasificada por IA
  "MENOR/MAYOR": string; // Clasificada por IA
  "ARMAS": string; // Clasificada por IA
  "LUGAR": string; // Clasificada por IA
  "TENTATIVA": string; // Clasificada por IA
  "OBSERVACIÓN": string; // Clasificada por IA (con tilde)
  "FRECUENCIA"?: string; // Columna "FRECUENCIA" de la plantilla, si existe.
  // Asegúrate de que no haya otras columnas en DELEGACION.xlsx que necesiten ser mapeadas aquí
}

// Mapeo entre las claves internas que la IA usará en su JSON y las claves EXACTAS del Excel (con caracteres especiales/exactas)
// Esto es para que el prompt de la IA trabaje con nombres de campo más sencillos (sin tildes/espacios/plurales si se desea),
// pero la salida final de Excel y la validación usen los nombres exactos de la plantilla.
export const DISPLAY_TO_INTERNAL_KEY_MAP: Record<keyof ClasificacionLegal, string> = {
  "id_hecho": "id_hecho",
  "nro_registro": "nro_registro",
  "ipp": "ipp",
  "fecha_carga": "fecha_carga",
  "hora_carga": "hora_carga",
  "dependencia": "dependencia",
  "fecha_inicio_hecho": "fecha_inicio_hecho",
  "hora_inicio_hecho": "hora_inicio_hecho",
  "partido_hecho": "partido_hecho",
  "localidad_hecho": "localidad_hecho",
  "latitud": "latitud",
  "calle": "calle",
  "longitud": "longitud",
  "altura": "altura",
  "entre": "entre",
  "calificaciones": "calificaciones",
  "relato": "relato",
  "JURISDICCIÓN": "JURISDICCION", // Mapea "JURISDICCIÓN" (Excel) a "JURISDICCION" (interno IA)
  "CALIFICACIÓN": "CALIFICACION LEGAL", // Mapea "CALIFICACIÓN" (Excel) a "CALIFICACION LEGAL" (interno IA)
  "MODALIDAD": "MODALIDAD",
  "VICTIMA/S": "VICTIMA", // Mapea "VICTIMA/S" (Excel) a "VICTIMA" (interno IA)
  "NO": "NO",
  "IMPUTADOS": "IMPUTADO", // Mapea "IMPUTADOS" (Excel) a "IMPUTADO" (interno IA)
  "MENOR/MAYOR": "MAYOR O MENOR",
  "ARMAS": "ARMA", // Mapea "ARMAS" (Excel) a "ARMA" (interno IA)
  "LUGAR": "LUGAR",
  "TENTATIVA": "TENTATIVA",
  "OBSERVACIÓN": "OBSERVACION", // Mapea "OBSERVACIÓN" (Excel) a "OBSERVACION" (interno IA)
  "FRECUENCIA": "FRECUENCIA"
};


// Valores válidos para las COLUMNAS CLASIFICADAS POR IA.
// ¡Estos valores deben coincidir EXACTAMENTE con las opciones de tus listas desplegables en DELEGACION.xlsx - Hoja1.csv
// y con las referencias del documento! Si hay tildes o mayúsculas/minúsculas, deben ser exactas.
// Las claves aquí son los nombres INTERNOS que usa la IA en su JSON (los valores del mapeo).
export const VALORES_VALIDOS: { [key: string]: string[] } = {
  "CALIFICACION LEGAL": [
    "ROBO", "HURTO", "LESIONES", "HOMICIDIO", "USURPACION",
    "ABUSO SEXUAL", "LEY 23737", "ABIGEATO", "ESTAFAS",
    "ABUSO DE ARMAS", "TENENCIA DE ARMAS", "PORTACION DE ARMAS",
    "ENCUBRIMIENTO", "NINGUNO DE INTERÉS", "OTROS" // "OTROS" agregado
  ],
  "MODALIDAD": [
    "ASALTO", "MOTOCHORRO", "ENTRADERA", "VIOLENCIA DE GÉNERO",
    "HOMICIDIO SIMPLE", "FEMICIDIO", "INTRAFAMILIAR", "EN RIÑA",
    "EN OCASIÓN DE ROBO", "AJUSTE DE CUENTAS", "ENFRENTAMIENTO ARMADO",
    "SUSTRACCION AUTOMOTOR", "SUSTRACCION MOTOVEHICULO", "ABUSO SEXUAL SIMPLE",
    "ABUSO SEXUAL CON ACCESO CARNAL", "TENENCIA", "CONSUMO", "COMERCIALIZACION",
    "SIEMBRA", "ABIGEATO", "ESTAFA MARKETPLACE", "ESTAFA WHATSAPP",
    "ESTAFA CUENTO DEL TIO", "ESTAFA OTROS", "ABUSO DE ARMAS",
    "TENENCIA DE ARMAS", "PORTACION DE ARMAS", "ENCUBRIMIENTO", "NO ESPECIFICADO"
  ],
  "ARMA": ["FUEGO", "BLANCA", "IMPROPIA", "NO ESPECIFICADO"],
  "LESIONADA": ["SI", "NO"], // REFERENCIAS.docx dice solo SI o NO
  "VICTIMA": ["MASCULINO", "FEMENINO", "AMBOS", "NO ESPECIFICADO"],
  "IMPUTADO": ["MASCULINO", "FEMENINO", "AMBOS", "NO ESPECIFICADO"],
  "MAYOR O MENOR": ["MAYOR", "MENOR", "AMBOS", "NO ESPECIFICADO"],
  "JURISDICCION": [ // Lista larga, debe ser exacta de DELEGACION.xlsx - Hoja1.csv
    "JOSÉ C. PAZ", "SAN MIGUEL", "MALVINAS ARGENTINAS", "PILAR", "TRES DE FEBRERO",
    "MORENO", "RODRIGUEZ", "GENERAL PAZ", "NAVARRO", "MERCEDES", "SUIPACHA",
    "LUJAN", "GENERAL LAS HERAS", "MARCOS PAZ", "GENERAL RODRÍGUEZ",
    "EXALTACIÓN DE LA CRUZ", "CAMPANA", "ZÁRATE", "ESCOBAR", "TIGRE",
    "SAN FERNANDO", "VICENTE LÓPEZ", "SAN ISIDRO", "SAN MARTIN", // SAN MARTIN (sin tilde aquí)
    "HURLINGHAM", "ITUZAINGÓ", "MERLO", "MORÓN", "LA MATANZA",
    "EZEIZA", "ESTEBAN ECHEVERRÍA", "LANÚS", "LOMAS DE ZAMORA", "AVELLANEDA",
    "QUILMES", "BERAZATEGUI", "FLORENCIO VARELA", "LA PLATA", "ENSENADA",
    "BERISSO", "BRANDSEN", "PRESIDENTE PERÓN", "SAN VICENTE", "CAÑUELAS",
    "GENERAL ALVEAR", "OLAVARRÍA", "AZUL", "TANDIL", "GENERAL PUEYRREDÓN",
    "MIRAMAR", "NECOCHEA", "BALCARCE", "OTRO", "NO ESPECIFICADO"
  ],
  "LUGAR": [
    "FINCA", "VÍA PÚBLICA", "COMERCIO", "ESTABLECIMIENTO EDUCATIVO",
    "TRANSPORTE PÚBLICO", "BANCO", "HOSPITAL", "OTRO", "NO ESPECIFICADO"
  ],
  "TENTATIVA": ["SI", "NO"],
  "OBSERVACION": ["NO ESPECIFICADO"], // Si es texto libre, este valor no debería ser una lista. Por ahora lo mantengo como lista con "NO ESPECIFICADO"
  "FRECUENCIA": ["DIARIA", "SEMANAL", "MENSUAL", "OCASIONAL", "NO ESPECIFICADO"]
};

// Valores por defecto para todas las columnas de clasificación.
// Las claves son las de 'ClasificacionLegal' (los nombres EXACTOS del Excel)
export const CLASIFICACION_DEFAULT: ClasificacionLegal = {
  "id_hecho": "",
  "nro_registro": "",
  "ipp": "",
  "fecha_carga": "",
  "hora_carga": "",
  "dependencia": "",
  "fecha_inicio_hecho": "",
  "hora_inicio_hecho": "",
  "partido_hecho": "",
  "localidad_hecho": "",
  "latitud": "",
  "calle": "",
  "longitud": "",
  "altura": "",
  "entre": "",
  "calificaciones": "",
  "relato": "",
  "JURISDICCIÓN": "NO ESPECIFICADO",
  "CALIFICACIÓN": "NINGUNO DE INTERÉS",
  "MODALIDAD": "NO ESPECIFICADO",
  "ARMA": "NO ESPECIFICADO",
  "LESIONADA": "NO",
  "VICTIMA/S": "NO ESPECIFICADO",
  "IMPUTADOS": "NO ESPECIFICADO",
  "MENOR/MAYOR": "NO ESPECIFICADO",
  "LUGAR": "NO ESPECIFICADO",
  "TENTATIVA": "NO",
  "OBSERVACIÓN": "NO ESPECIFICADO",
  "FRECUENCIA": "NO ESPECIFICADO"
};

export interface FilaExcel {
  [key: string]: string | number | boolean | undefined;
}

export interface FilaClasificada extends FilaExcel, ClasificacionLegal {
  indiceOriginal?: number;
  error?: string;
}

export interface ProcessedRowData {
  originalIndex: number;
  originalRowData: FilaExcel;
  classification: ClasificacionLegal;
  RELATO_NORMALIZED_VALUE: string;
  errorMessage?: string;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

// Las claves que la IA debería intentar clasificar.
// Estas deben ser los nombres EXACTOS de las columnas en el Excel (displayKeys).
// El mapeo a claves internas (sin tildes, etc.) se hace vía DISPLAY_TO_INTERNAL_KEY_MAP.
export const IA_CLASSIFICATION_KEYS: (keyof ClasificacionLegal)[] = [
  "JURISDICCIÓN", // Clave de Excel con tilde
  "CALIFICACIÓN", // Clave de Excel con tilde
  "MODALIDAD",
  "VICTIMA/S", // Clave de Excel con /S
  "IMPUTADOS", // Clave de Excel con plural
  "MENOR/MAYOR", // Clave de Excel con /
  "ARMAS", // Clave de Excel con plural
  "LUGAR",
  "TENTATIVA",
  "OBSERVACIÓN", // Clave de Excel con tilde
  "FRECUENCIA"
];

// Encabezados para la exportación final del Excel.
// ¡Este orden DEBE COINCIDIR EXACTAMENTE con el orden de las columnas en tu plantilla DELEGACION.xlsx - Sheet1.csv!
// Y las claves deben ser los nombres EXACTOS de las columnas en la plantilla.
export const EXCEL_OUTPUT_HEADERS: (keyof ClasificacionLegal)[] = [
  "id_hecho",
  "nro_registro",
  "ipp",
  "fecha_carga",
  "hora_carga",
  "dependencia",
  "fecha_inicio_hecho",
  "hora_inicio_hecho",
  "partido_hecho",
  "localidad_hecho",
  "latitud",
  "calle",
  "longitud",
  "altura",
  "entre",
  "calificaciones", // Esta es la columna 'caratula' original, no la de IA
  "relato", // El relato original
  "JURISDICCIÓN",
  "CALIFICACIÓN",
  "MODALIDAD",
  "VICTIMA/S",
  "NO", // Columna "NO" del template
  "IMPUTADOS",
  "MENOR/MAYOR",
  "ARMAS",
  "LUGAR",
  "TENTATIVA",
  "OBSERVACIÓN",
  "FRECUENCIA"
];

// Etiquetas para mostrar en la tabla de la UI (ResultsDisplay).
// Mapea los nombres exactos de las columnas de Excel a etiquetas más amigables si es necesario.
export const CLASSIFICATION_LABELS: Record<keyof ClasificacionLegal, string> = {
  "id_hecho": "ID Hecho",
  "nro_registro": "Nro Registro",
  "ipp": "IPP",
  "fecha_carga": "Fecha Carga",
  "hora_carga": "Hora Carga",
  "dependencia": "Dependencia",
  "fecha_inicio_hecho": "Fecha Inicio Hecho",
  "hora_inicio_hecho": "Hora Inicio Hecho",
  "partido_hecho": "Partido Hecho",
  "localidad_hecho": "Localidad Hecho",
  "latitud": "Latitud",
  "calle": "Calle",
  "longitud": "Longitud",
  "altura": "Altura",
  "entre": "Entre Calles",
  "calificaciones": "Carátula Original",
  "relato": "Relato Original",
  "JURISDICCIÓN": "Jurisdicción",
  "CALIFICACIÓN": "Calificación Legal",
  "MODALIDAD": "Modalidad",
  "ARMA": "Arma",
  "LESIONADA": "¿Lesionada?",
  "VICTIMA/S": "Víctima(s)",
  "IMPUTADOS": "Imputado(s)",
  "MENOR/MAYOR": "Mayor/Menor",
  "LUGAR": "Lugar",
  "TENTATIVA": "Tentativa",
  "OBSERVACIÓN": "Observación",
  "FRECUENCIA": "Frecuencia",
  "NO": "Columna Vacía"
};