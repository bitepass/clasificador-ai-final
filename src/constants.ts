// Modelo Gemini actualizado
// Probando con 'gemini-1.5-flash-latest' como alternativa debido al error 404 con gemini-1.0-pro.
// Este es un modelo flash más reciente, optimizado para ser rápido y eficiente.
export const GEMINI_MODEL_NAME = 'gemini-1.5-flash-latest'; // ¡CAMBIO AQUI!

// Columna que contiene el relato
export const RELATO_COLUMN_KEYWORDS = ['RELATO', 'relato', 'Relato'];

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