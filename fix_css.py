def fix():
    with open('src/views/BatchAutomation.vue', 'r', encoding='utf-8') as f:
        content = f.read()

    old = """.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  position: sticky;
  left: 170px;
  z-index: 10;
  border-right: 2px solid #e0e0e0;
}"""

    new = """.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 300px !important;
  min-width: 300px !important;
  max-width: 300px !important;
  position: sticky;
  left: 170px;
  z-index: 10;
  border-right: 2px solid #e0e0e0;
}"""

    content = content.replace(old, new)
    with open('src/views/BatchAutomation.vue', 'w', encoding='utf-8') as f:
        f.write(content)

fix()
