// src/constants.ts

// Modelo Gemini actualizado
export const GEMINI_MODEL_NAME = 'gemini-1.5-flash-latest';

// Columna que contiene el relato - ¡Ampliamos las palabras clave!
// Incluimos variaciones comunes en Excel, con/sin tilde, plurales, y errores.
export const RELATO_COLUMN_KEYWORDS = [
  'RELATO', 'relato', 'Relato', // Ya existentes
  'RELATOS', 'relatos', // Plural
  'RELATÓ', 'relató', // Con tilde
  'RLATO', 'rlato', // Errores comunes
  'DESCRIPCION', 'descripcion', 'Descripcion', // Alternativas comunes
  'HECHOS', 'hechos', 'Hechos', // Otra alternativa
  'CUERPO DEL RELATO', 'cuerpo del relato', // Si el encabezado es más largo
];


// Clasificación por defecto (compatible con tu lógica actual)
export const DEFAULT_CLASSIFICATION = {
  "CALIFICACION LEGAL": "NINGUNO DE INTERÉS",
  "MODALIDAD": "NO ESPECIFICADO",
  "ARMA": "NO ESPECIFICADO",
  "LESIONADA": "NO",
  "VICTIMA": "NO ESPECIFICADO",
  "IMPUTADO": "NO ESPECIFICADO"
};

// Artículos del Código Penal para el LOG
export const ARTICULOS_CODIGO_PENAL = {
  ROBO: "art. 164 (robo simple) o art. 166 (robo calificado)",
  HURTO: "art. 162",
  LESIONES: "arts. 89-92 (lesiones dolosas)",
  HOMICIDIO: "arts. 79-80 (homicidio simple o calificado)"
};