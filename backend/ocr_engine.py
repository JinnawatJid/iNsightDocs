import easyocr
import sys
import json
import os
import fitz  # PyMuPDF
import numpy as np

def analyze_image(file_path):
    """
    Analyzes an image or PDF using EasyOCR and returns the extracted text.
    """
    try:
        # Initialize the reader.
        reader = easyocr.Reader(['th', 'en'], gpu=False)

        extracted_data = []
        full_text = []

        file_ext = os.path.splitext(file_path)[1].lower()

        if file_ext == '.pdf':
            # Handle PDF
            doc = fitz.open(file_path)
            for page_num, page in enumerate(doc):
                # Render page to image (pixmap)
                # matrix=fitz.Matrix(2, 2) increases resolution for better OCR
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

                # Convert to numpy array (EasyOCR accepts numpy array)
                # pix.samples is bytes, we need to reshape it
                # We need to make sure we handle alpha channel if present, though PDF usually RGB
                if pix.n < 3:
                     # Grayscale
                     img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w)
                else:
                     # RGB or RGBA
                     img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                     if pix.n == 4:
                         # Drop alpha channel
                         img = img[:, :, :3]

                result = reader.readtext(img)

                for (bbox, text, prob) in result:
                    extracted_data.append({
                        "text": text,
                        "confidence": float(prob),
                        "bbox": [[int(p[0]), int(p[1])] for p in bbox],
                        "page": page_num + 1
                    })
                    full_text.append(text)

            doc.close()

        else:
            # Handle Image
            result = reader.readtext(file_path)

            for (bbox, text, prob) in result:
                extracted_data.append({
                    "text": text,
                    "confidence": float(prob),
                    "bbox": [[int(p[0]), int(p[1])] for p in bbox],
                    "page": 1
                })
                full_text.append(text)

        output = {
            "success": True,
            "full_text": "\n".join(full_text),
            "details": extracted_data
        }

    except Exception as e:
        output = {
            "success": False,
            "error": str(e)
        }

    # Print JSON to stdout so Node.js can capture it
    print(json.dumps(output, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(json.dumps({"success": False, "error": f"File not found: {file_path}"}))
        sys.exit(1)

    analyze_image(file_path)
