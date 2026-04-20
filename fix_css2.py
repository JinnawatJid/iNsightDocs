def fix():
    with open('src/views/BatchAutomation.vue', 'r', encoding='utf-8') as f:
        content = f.read()

    # Also let's set table-layout fixed to enforce widths
    old = """.data-table {
  width: 100%;
  border-collapse: collapse;
}"""

    new = """.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}"""

    content = content.replace(old, new)
    with open('src/views/BatchAutomation.vue', 'w', encoding='utf-8') as f:
        f.write(content)

fix()
