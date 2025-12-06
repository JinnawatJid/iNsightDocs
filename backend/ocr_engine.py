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
        page_dimensions = {} # Map page_num -> {width, height}

        file_ext = os.path.splitext(file_path)[1].lower()

        if file_ext == '.pdf':
            # Handle PDF
            doc = fitz.open(file_path)
            for page_num, page in enumerate(doc):
                # Render page to image (pixmap)
                # matrix=fitz.Matrix(2, 2) increases resolution for better OCR
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

                # Store dimensions
                current_page = page_num + 1
                page_dimensions[current_page] = {"width": pix.w, "height": pix.h}

                # Convert to numpy array (EasyOCR accepts numpy array)
                if pix.n < 3:
                     img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w)
                else:
                     img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                     if pix.n == 4:
                         img = img[:, :, :3]

                result = reader.readtext(img)

                for (bbox, text, prob) in result:
                    extracted_data.append({
                        "text": text,
                        "confidence": float(prob),
                        "bbox": [[int(p[0]), int(p[1])] for p in bbox],
                        "page": current_page
                    })
                    full_text.append(text)

            doc.close()

        else:
            # Handle Image
            # For images, we need dimensions too for consistent frontend logic
            # EasyOCR reads it internally, but let's read it to get dims
            # Use Pillow or just let easyocr read it, but we need dims.
            # Let's use easyocr to read first, then if we need dims, we might need to open it.
            # Actually, `readtext` accepts a file path.
            result = reader.readtext(file_path)

            # To get dimensions for image, we can use fitz or PIL.
            # Let's use fitz since we have it, or PIL if installed.
            # fitz can open images too.
            try:
                with fitz.open(file_path) as img_doc:
                    page = img_doc[0]
                    rect = page.rect
                    # Note: easyocr might read it differently if it's just a path,
                    # but usually it respects the image size.
                    # fitz.open(image) treats it as a PDF page with that size.
                    # pix = page.get_pixmap() -> width/height
                    # However, simple images don't have "pages" in OCR output usually (defaults to 1).
                    page_dimensions[1] = {"width": int(rect.width), "height": int(rect.height)}
                    # Wait, rect.width might be points. Let's use a standard image library if possible.
                    # Actually, we can just rely on frontend for images because
                    # for images, frontend loads the EXACT SAME file.
                    # For PDF, frontend renders a NEW representation, so scaling matters.
                    # So for images, we might not strictly need backend dims if we assume 1:1.
                    # But let's try to provide it for consistency.
                    pix = page.get_pixmap()
                    page_dimensions[1] = {"width": pix.w, "height": pix.h}
            except:
                pass # Fallback if fails

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
            "details": extracted_data,
            "page_dimensions": page_dimensions
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
