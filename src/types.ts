export enum AppStep {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING', 
  RESULTS = 'RESULTS',
}

// Clasificaciones que usás en tu lógica actual
export interface ClasificacionLegal {
  "CALIFICACION LEGAL": string;
  "MODALIDAD": string;
  "ARMA": string;
  "LESIONADA": string;
  "VICTIMA": string;
  "IMPUTADO": string;
}

// Valores válidos según tu lógica legal
export const VALORES_VALIDOS = {
  "CALIFICACION LEGAL": ["ROBO", "HURTO", "LESIONES", "HOMICIDIO", "NINGUNO DE INTERÉS"],
  "MODALIDAD": ["ASALTO", "MOTOCHORRO", "ENTRADERA", "VIOLENCIA DE GÉNERO", "NO ESPECIFICADO"],
  "ARMA": ["FUEGO", "BLANCA", "NO ESPECIFICADO"],
  "LESIONADA": ["SI", "NO"],
  "VICTIMA": ["MASCULINO", "FEMENINO", "NO ESPECIFICADO"],
  "IMPUTADO": ["MASCULINO", "FEMENINO", "NO ESPECIFICADO"]
};

// Clasificación por defecto
export const CLASIFICACION_DEFAULT: ClasificacionLegal = {
  "CALIFICACION LEGAL": "NINGUNO DE INTERÉS",
  "MODALIDAD": "NO ESPECIFICADO",
  "ARMA": "NO ESPECIFICADO",
  "LESIONADA": "NO",
  "VICTIMA": "NO ESPECIFICADO",
  "IMPUTADO": "NO ESPECIFICADO"
};

// Interface para filas del Excel
export interface FilaExcel {
  [key: string]: any;
  relato?: string;
  RELATO?: string;
}

export interface FilaClasificada extends FilaExcel, ClasificacionLegal {
  indiceOriginal?: number;
  error?: string;
}

// Props para componentes
export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}