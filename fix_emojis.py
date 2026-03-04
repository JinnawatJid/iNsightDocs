import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Restore the allowed emojis per the UI_ICON_STANDARD.md

    # 1. 📄 for reports
    content = content.replace("แบบย่อ (Summary)", "📄 แบบย่อ (Summary)")
    content = content.replace("แบบละเอียด (Full Detail)", "📄 แบบละเอียด (Full Detail)")

    # 2. 📄 for documents in debugFiles
    content = content.replace("{ key: 'profile', label: 'Company Profile (PDF)', icon: '' }", "{ key: 'profile', label: 'Company Profile (PDF)', icon: '📄' }")
    content = content.replace("{ key: 'balanceSheet', label: 'งบดุล (XLSX)', icon: '' }", "{ key: 'balanceSheet', label: 'งบดุล (XLSX)', icon: '📄' }")
    content = content.replace("{ key: 'incomeStatement', label: 'งบกำไรขาดทุน (XLSX)', icon: '' }", "{ key: 'incomeStatement', label: 'งบกำไรขาดทุน (XLSX)', icon: '📄' }")
    content = content.replace("{ key: 'financialRatios', label: 'อัตราส่วนการเงิน (XLSX)', icon: '' }", "{ key: 'financialRatios', label: 'อัตราส่วนการเงิน (XLSX)', icon: '📄' }")

    # 3. ❌ for Not Found in debug files
    # Check if we removed it previously
    if "❌" not in content.split("<!-- DROPDOWN FOR EXPORT -->")[1]: # a rough check
        # We did not replace ❌ in the python script, but let's double check it.
        # Oh, in the previous script I didn't replace it, but let me make sure.
        pass

    # The previous python script had:
    # ("📄 แบบย่อ (Summary)", "แบบย่อ (Summary)")
    # ("📊 แบบละเอียด (Full Detail)", "แบบละเอียด (Full Detail)") -> I should make this 📄

    # Wait, if I replace "แบบย่อ (Summary)" to "📄 แบบย่อ (Summary)", I might double it.
    # Let's be exact.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Actually, let's just use replace with exact matches
def exact_replace():
    with open('src/views/BatchAutomation.vue', 'r', encoding='utf-8') as f:
        text = f.read()

    text = text.replace(">แบบย่อ (Summary)</a>", ">📄 แบบย่อ (Summary)</a>")
    text = text.replace(">แบบละเอียด (Full Detail)</a>", ">📄 แบบละเอียด (Full Detail)</a>")

    text = text.replace("{ key: 'profile', label: 'Company Profile (PDF)', icon: '' }", "{ key: 'profile', label: 'Company Profile (PDF)', icon: '📄' }")
    text = text.replace("{ key: 'balanceSheet', label: 'งบดุล (XLSX)', icon: '' }", "{ key: 'balanceSheet', label: 'งบดุล (XLSX)', icon: '📄' }")
    text = text.replace("{ key: 'incomeStatement', label: 'งบกำไรขาดทุน (XLSX)', icon: '' }", "{ key: 'incomeStatement', label: 'งบกำไรขาดทุน (XLSX)', icon: '📄' }")
    text = text.replace("{ key: 'financialRatios', label: 'อัตราส่วนการเงิน (XLSX)', icon: '' }", "{ key: 'financialRatios', label: 'อัตราส่วนการเงิน (XLSX)', icon: '📄' }")

    with open('src/views/BatchAutomation.vue', 'w', encoding='utf-8') as f:
        f.write(text)

exact_replace()
