
filename = "à¸ªà¸³à¹à¸à¸²à¸à¸±à¸à¸£à¸à¸£à¸°à¸à¸²à¸à¸_page-0001.jpg"
try:
    # It looks like UTF-8 bytes were interpreted as Latin-1 (ISO-8859-1)
    # So we encode to Latin-1 to get the original bytes back, then decode as UTF-8
    decoded = filename.encode('latin1').decode('utf-8')
    print(f"Decoded: {decoded}")
except Exception as e:
    print(f"Error: {e}")
