from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import pandas as pd
import os
import tempfile
from openpyxl import load_workbook

app = Flask(__name__)
CORS(app)

def clasificar_relato(relato: str) -> dict:
    """Lógica simulada para clasificar un relato según palabras clave."""
    if not isinstance(relato, str) or relato.strip() == "":
        return {
            "CLASIFICACION": "RELATO VACÍO",
            "ARTICULO": "",
            "DELITO": "",
            "AGRAVANTE": "",
            "errorMessage": "Relato vacío, usando valores por defecto."
        }

    relato_lower = relato.lower()

    if "arma" in relato_lower and "robo" in relato_lower:
        return {
            "CLASIFICACION": "ROBO AGRAVADO",
            "ARTICULO": "166",
            "DELITO": "ROBO",
            "AGRAVANTE": "USO DE ARMA",
            "errorMessage": ""
        }
    elif "homicidio" in relato_lower:
        return {
            "CLASIFICACION": "HOMICIDIO",
            "ARTICULO": "79",
            "DELITO": "HOMICIDIO",
            "AGRAVANTE": "",
            "errorMessage": ""
        }
    else:
        return {
            "CLASIFICACION": "SIN CLASIFICAR",
            "ARTICULO": "",
            "DELITO": "",
            "AGRAVANTE": "",
            "errorMessage": "No se pudo clasificar automáticamente."
        }

@app.route('/process-excel', methods=['POST'])
def process_excel():
    try:
        data_file = request.files.get("dataFile")
        template_file = request.files.get("templateFile")

        if not data_file:
            return jsonify({"error": "Falta el archivo base de datos Excel"}), 400

        df = pd.read_excel(data_file)
        log_lines = []

        # Clasificar cada fila
        clasificaciones = []
        for i, row in df.iterrows():
            relato = str(row.get("RELATO", "")).strip()
            resultado = clasificar_relato(relato)
            clasificaciones.append(resultado)

            log_line = f"Fila {i + 1}: {resultado['CLASIFICACION']} | Art: {resultado['ARTICULO']} | {resultado['errorMessage']}"
            log_lines.append(log_line)

        # Convertir lista de dicts en DataFrame de clasificación
        clasif_df = pd.DataFrame(clasificaciones)

        # Combinar con df original
        final_df = pd.concat([df.reset_index(drop=True), clasif_df], axis=1)

        # Crear archivos temporales
        temp_excel = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
        temp_log = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")

        # Si hay plantilla, copiar sobre ella
        if template_file:
            wb = load_workbook(template_file)
            ws = wb.active

            # Insertar resultados a partir de fila 2, columna 1
            for i, row in final_df.iterrows():
                ws.cell(row=i + 2, column=1, value=row.get("RELATO", ""))
                ws.cell(row=i + 2, column=2, value=row.get("CLASIFICACION", ""))
                ws.cell(row=i + 2, column=3, value=row.get("ARTICULO", ""))
                ws.cell(row=i + 2, column=4, value=row.get("DELITO", ""))
                ws.cell(row=i + 2, column=5, value=row.get("AGRAVANTE", ""))

            wb.save(temp_excel.name)
        else:
            final_df.to_excel(temp_excel.name, index=False)

        # Guardar LOG
        with open(temp_log.name, "w", encoding="utf-8") as log_file:
            log_file.write("\n".join(log_lines))

        print(f"[✔] Procesamiento exitoso. Archivo: {temp_excel.name}")
        return send_file(temp_excel.name, as_attachment=True, download_name="Clasificado_Final.xlsx")

    except Exception as e:
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host="localhost", port=5000, debug=True)
