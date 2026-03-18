import re

with open('src/components/credit/tabs/RequestInfoTab.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Hide แผนก
content = re.sub(
    r'<div class="form-group">\s*<label>แผนก</label>',
    r'<div class="form-group" v-if="false">\n            <label>แผนก</label>',
    content
)

# Remove the empty placeholder
content = re.sub(
    r'<div class="form-group"></div> <!-- Empty Placeholder -->\s*',
    r'',
    content
)

# Update CSS for contact-grid-layout
content = re.sub(
    r'\.contact-grid-layout \{\s*display: grid;\s*grid-template-columns: 1fr 1fr 1fr;',
    r'.contact-grid-layout {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr 1fr;',
    content
)

with open('src/components/credit/tabs/RequestInfoTab.vue', 'w', encoding='utf-8') as f:
    f.write(content)
