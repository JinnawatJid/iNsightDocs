import easyocr
import sys
import json
import os

def analyze_image(image_path):
    """
    Analyzes an image using EasyOCR and returns the extracted text.
    """
    try:
        # Initialize the reader.
        # 'th' for Thai, 'en' for English.
        # gpu=False for compatibility in environments without CUDA, though it will be slower.
        # In a real production environment with GPU, set gpu=True.
        reader = easyocr.Reader(['th', 'en'], gpu=False)

        # Read the image
        result = reader.readtext(image_path)

        # Format the output
        extracted_data = []
        full_text = []

        for (bbox, text, prob) in result:
            extracted_data.append({
                "text": text,
                "confidence": float(prob),
                "bbox": [ [int(p[0]), int(p[1])] for p in bbox ] # Convert numpy int to standard int
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
        print(json.dumps({"success": False, "error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(json.dumps({"success": False, "error": f"File not found: {image_path}"}))
        sys.exit(1)

    analyze_image(image_path)
