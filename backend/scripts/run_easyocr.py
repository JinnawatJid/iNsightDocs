import easyocr
import sys
import os

# Ensure stdout uses UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def main():
    if len(sys.argv) < 2:
        print("Usage: python run_easyocr.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(f"Error: File not found at {image_path}")
        sys.exit(1)

    try:
        # Initialize reader (gpu=True if available)
        # Note: This will download models on the first run (~20MB)
        reader = easyocr.Reader(['th', 'en'])

        # detail=0 returns just the text list
        # paragraph=True combines text lines
        result = reader.readtext(image_path, detail=0, paragraph=True)

        # Join into a single string
        text = "\n".join(result)

        print(text)

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
