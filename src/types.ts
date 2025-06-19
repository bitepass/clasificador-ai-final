export enum AppStep {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS',
}

// Interfaz para las clasificaciones legales, incluyendo TODAS las columnas de la plantilla DELEGACION.xlsx
// y el orden sugerido por tu jefe. Las claves deben coincidir EXACTAMENTE con los encabezados de Excel.
export interface ClasificacionLegal {
  "NRO": string; // Esta es la columna "NRO" de tu plantilla original, a rellenar por el dato original
  "FECHA DE INICIO DE ACTUACIONES": string;
  "NRO ACTUACION POLICIAL": string;
  "CARATULA": string;
  "RELATO": string; // El relato original del Excel, importante para mantenerlo en la salida
  "CALIFICACION LEGAL": string;
  "MODALIDAD": string;
  "ARMA": string;
  "LESIONADA": string;
  "VICTIMA": string;
  "IMPUTADO": string;
  "MAYOR O MENOR": string;
  "JURISDICCION": string;
  "LUGAR": string;
  "TENTATIVA": string;
  "OBSERVACION": string;
  "FRECUENCIA": string; // Columna "FRECUENCIA" de la plantilla, si existe.
  // Asegúrate de que no haya otras columnas en DELEGACION.xlsx que necesiten ser mapeadas aquí
}

// Valores válidos según la REFERENCIAS.docx y listas desplegables de DELEGACION.xlsx.
// Estos son CRÍTICOS para el prompt de la IA y la validación.
export const VALORES_VALIDOS = {
  "CALIFICACION LEGAL": [
    "ROBO", "HURTO", "LESIONES", "HOMICIDIO", "USURPACION",
    "ABUSO SEXUAL", "LEY 23737", "ABIGEATO", "ESTAFAS",
    "ABUSO DE ARMAS", "TENENCIA DE ARMAS", "PORTACION DE ARMAS",
    "ENCUBRIMIENTO", "NINGUNO DE INTERÉS", "OTROS" // Agregué "OTROS" por si acaso, si no existe eliminar
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
  "LESIONADA": ["SI", "NO"], // Según REFERENCIAS.docx
  "VICTIMA": ["MASCULINO", "FEMENINO", "AMBOS", "NO ESPECIFICADO"],
  "IMPUTADO": ["MASCULINO", "FEMENINO", "AMBOS", "NO ESPECIFICADO"],
  "MAYOR O MENOR": ["MAYOR", "MENOR", "AMBOS", "NO ESPECIFICADO"],
  "JURISDICCION": [
    "JOSÉ C. PAZ", "SAN MIGUEL", "MALVINAS ARGENTINAS", "PILAR", "TRES DE FEBRERO",
    "MORENO", "RODRIGUEZ", "GENERAL PAZ", "NAVARRO", "MERCEDES", "SUIPACHA",
    "LUJAN", "GENERAL LAS HERAS", "MARCOS PAZ", "GENERAL RODRÍGUEZ",
    "EXALTACIÓN DE LA CRUZ", "CAMPANA", "ZÁRATE", "ESCOBAR", "TIGRE",
    "SAN FERNANDO", "VICENTE LÓPEZ", "SAN ISIDRO", "SAN MARTIN",
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
  "TENTATIVA": ["SI", "NO"], // Según REFERENCIAS.docx
  "OBSERVACION": ["NO ESPECIFICADO"], // Asumo que si no hay info se usa esto. Si es texto libre, eliminar de VALORES_VALIDOS
  "FRECUENCIA": ["DIARIA", "SEMANAL", "MENSUAL", "OCASIONAL", "NO ESPECIFICADO"] // Asumo valores, si hay lista en DELEGACION.xlsx, usar esa.
};

// Clasificación por defecto actualizada con todas las columnas de ClasificacionLegal
// Los campos que NO son clasificados por IA (como NRO, FECHA, NRO ACTUACION, CARATULA, RELATO)
// deben inicializarse con un string vacío porque se rellenarán con los datos originales del Excel.
export const CLASIFICACION_DEFAULT: ClasificacionLegal = {
  "NRO": "",
  "FECHA DE INICIO DE ACTUACIONES": "",
  "NRO ACTUACION POLICIAL": "",
  "CARATULA": "",
  "RELATO": "",
  "CALIFICACION LEGAL": "NINGUNO DE INTERÉS",
  "MODALIDAD": "NO ESPECIFICADO",
  "ARMA": "NO ESPECIFICADO",
  "LESIONADA": "NO",
  "VICTIMA": "NO ESPECIFICADO",
  "IMPUTADO": "NO ESPECIFICADO",
  "MAYOR O MENOR": "NO ESPECIFICADO",
  "JURISDICCION": "NO ESPECIFICADO",
  "LUGAR": "NO ESPECIFICADO",
  "TENTATIVA": "NO",
  "OBSERVACION": "NO ESPECIFICADO",
  "FRECUENCIA": "NO ESPECIFICADO"
};

// Interface para filas del Excel original (permite cualquier columna)
// Si el Excel tiene una columna 'relato' o 'RELATO', se usará esa.
export interface FilaExcel {
  [key: string]: any;
}

// Fila clasificada extendida, incluye la clasificación y metadatos de procesamiento.
export interface FilaClasificada extends FilaExcel, ClasificacionLegal {
  indiceOriginal?: number;
  error?: string;
}

// Interfaz para los datos procesados que ResultsDisplay espera.
// Contiene la fila original, la clasificación de IA/legal y metadatos de error/display.
export interface ProcessedRowData {
  originalIndex: number; // Índice original para la tabla (base 0)
  originalRowData: FilaExcel; // Mantener la fila original completa aquí
  classification: ClasificacionLegal; // La clasificación obtenida (IA o por defecto), ya con todos los campos
  RELATO_NORMALIZED_VALUE: string; // El relato limpio para mostrar en la vista previa
  errorMessage?: string; // Mensaje de error si lo hubo
}

// Props para componentes de modales
export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

// Columnas que la IA es responsable de clasificar.
// Son un subconjunto de ClasificacionLegal, las que NO son del Excel original
export const IA_CLASSIFICATION_KEYS: (keyof ClasificacionLegal)[] = [
  "CALIFICACION LEGAL",
  "MODALIDAD",
  "ARMA",
  "LESIONADA",
  "VICTIMA",
  "IMPUTADO",
  "MAYOR O MENOR",
  "JURISDICCION",
  "LUGAR",
  "TENTATIVA",
  "OBSERVACION",
  "FRECUENCIA"
];

// Encabezados en el ORDEN EXACTO en que deben aparecer en el archivo Excel final.
// ¡Este orden DEBE COINCIDIR con el orden de tu plantilla DELEGACION.xlsx!
export const EXCEL_OUTPUT_HEADERS: (keyof ClasificacionLegal)[] = [
  "NRO",
  "FECHA DE INICIO DE ACTUACIONES",
  "NRO ACTUACION POLICIAL",
  "CARATULA",
  "RELATO", // El relato original debe ir aquí en el Excel
  "CALIFICACION LEGAL",
  "MODALIDAD",
  "ARMA",
  "LESIONADA",
  "VICTIMA",
  "IMPUTADO",
  "MAYOR O MENOR",
  "JURISDICCION",
  "LUGAR",
  "TENTATIVA",
  "OBSERVACION",
  "FRECUENCIA"
];

// Etiquetas para mostrar en la tabla de la UI (ResultsDisplay)
// Usamos las mismas claves que EXCEL_OUTPUT_HEADERS para consistencia,
// pero puedes personalizar las etiquetas de display.
export const CLASSIFICATION_LABELS: Record<keyof ClasificacionLegal, string> = {
  "NRO": "Nro. Acta",
  "FECHA DE INICIO DE ACTUACIONES": "Fecha Inicio",
  "NRO ACTUACION POLICIAL": "Nro. Actuación",
  "CARATULA": "Carátula Original",
  "RELATO": "Relato (Original)",
  "CALIFICACION LEGAL": "Calificación Legal",
  "MODALIDAD": "Modalidad",
  "ARMA": "Arma",
  "LESIONADA": "¿Lesionada?",
  "VICTIMA": "Víctima",
  "IMPUTADO": "Imputado",
  "MAYOR O MENOR": "Mayor/Menor",
  "JURISDICCION": "Jurisdicción",
  "LUGAR": "Lugar",
  "TENTATIVA": "Tentativa",
  "OBSERVACION": "Observación",
  "FRECUENCIA": "Frecuencia"
};