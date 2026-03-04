with open('src/views/BatchAutomation.vue', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("${f.label} (Not Found)", "❌ ${f.label} (Not Found)")
text = text.replace("cancelButtonText: 'ส่งออกรายชื่อที่ไม่พร้อม (Excel)'", "cancelButtonText: '📄 ส่งออกรายชื่อที่ไม่พร้อม (Excel)'")

with open('src/views/BatchAutomation.vue', 'w', encoding='utf-8') as f:
    f.write(text)
