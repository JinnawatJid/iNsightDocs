import re

text = """
เลขทะเบียนนิติบุคคล : 0205538007136
ประเภทนิติบุคคล : บริษัทจำกัด
วันที่จดทะเบียนจัดตั้ง : 27/11/2538
สถานะนิติบุคคล : ยังดำเนินกิจการอยู่
ทุนจดทะเบียน (บาท) : 3,000,000.00
ที่ตั้ง : 571/7-15 หมู่ที่ 5
"""

# Test Date Extraction
date_regex = r"วันที่จดทะเบียนจัดตั้ง\s*[:]\s*(\d{2}\/\d{2}\/\d{4})"
date_match = re.search(date_regex, text)
if date_match:
    print(f"Date Found: {date_match.group(1)}")
else:
    print("Date Not Found")

# Test Capital Extraction
capital_regex = r"ทุนจดทะเบียน\s*\(บาท\)\s*[:]\s*([\d,]+\.?\d*)"
capital_match = re.search(capital_regex, text)
if capital_match:
    raw_cap = capital_match.group(1)
    print(f"Capital Found: {raw_cap}")
    # clean
    clean_cap = float(raw_cap.replace(',', ''))
    print(f"Capital Value: {clean_cap}")
else:
    print("Capital Not Found")
