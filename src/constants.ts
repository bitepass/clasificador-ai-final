// Modelo Gemini actualizado
// Cambiamos 'gemini-pro' a 'gemini-1.0-pro' que es el nombre actual y estable para este tipo de tarea.
// Si deseas probar el modelo más avanzado (y con mayor contexto), puedes usar 'gemini-1.5-pro-latest'
// pero ten en cuenta sus límites de uso y posibles costos si excedes el free tier.
export const GEMINI_MODEL_NAME = 'gemini-1.0-pro'; // CAMBIADO AQUÍ

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