def fix():
    with open('src/views/BatchAutomation.vue', 'r', encoding='utf-8') as f:
        content = f.read()

    # Need to make sure the specific min-width rules are not overridden by the general one
    # Vue scoped CSS sometimes behaves weirdly with nth-child, or other CSS frameworks.
    # The padding is adding 24px (12px * 2) plus 1px border.
    # So width 300px + 24px + 1px = 325px. That's why it was 325px!

    # Let's add box-sizing: border-box to all th and td to ensure width is exactly 300px
    old = """.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}"""

    new = """.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
  box-sizing: border-box;
}"""

    content = content.replace(old, new)
    with open('src/views/BatchAutomation.vue', 'w', encoding='utf-8') as f:
        f.write(content)

fix()
