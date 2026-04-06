import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Broaden regex to ensure we match the outer div
    pattern = r'<div class="form-group full-width" style="border-top: 1px solid #ddd; padding-top: 25px; margin-top: 25px;">\s*<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">\s*<label style="margin: 0;">รายการสินค้าหลัก:.*?<\/div>\s*(?:<div v-if=".*?(?:<\/div>\s*){3})?(?:<div v-else.*?>.*?<\/div>\s*)?<\/div>\s*(?=<div class="form-group full-width" style="margin-top: 20px;">)'

    new_content = re.sub(pattern, '', content, flags=re.DOTALL)

    if new_content == content:
        print(f"Warning: No change made to {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Processed {filepath}")

process_file('src/components/credit/tabs/project-workspace/ProjectInfoSection.vue')
