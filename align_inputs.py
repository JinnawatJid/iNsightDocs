import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We will close the current <div class="form-grid-three-columns"> after expected end date
    # Then we will open a new <div class="form-grid-three-columns" style="margin-top: 15px;">
    # to hold the financial metrics so they always start on a fresh row.

    # Find the expected end date block, close the grid, and open a new one
    pattern = r'(<div class="form-group">\s*<label>วันที่คาดว่าจะแล้วเสร็จ<\/label>.*?<\/div>\s*)(<div class="form-group">\s*<label>มูลค่าโครงการรวม \(บาท\)<\/label>)'

    replacement = r'\1</div>\n      <div class="form-grid-three-columns" style="margin-top: 15px;">\n          \2'

    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    if new_content == content:
        print(f"Warning: No match found in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Processed {filepath}")

process_file('src/components/credit/tabs/project-workspace/ProjectInfoSection.vue')
process_file('src/components/credit/tabs/ProjectInfoTab.vue')
