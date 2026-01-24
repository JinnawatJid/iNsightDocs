import easyocr
import sys
import json
import warnings

# Suppress warnings to ensure only JSON is printed to stdout
warnings.filterwarnings("ignore")

def process_image(image_path):
    try:
        # Initialize the reader for Thai and English
        # gpu=False forces CPU usage which is safer for this environment
        reader = easyocr.Reader(['th', 'en'], gpu=False, verbose=False)

        # Read the image
        result = reader.readtext(image_path, detail=0)

        # Join the text results
        text_output = '\n'.join(result)

        # Output JSON to stdout
        print(json.dumps({"success": True, "text": text_output}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]
    process_image(image_path)
