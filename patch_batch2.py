import re

with open('src/views/BatchAutomation.vue', 'r') as f:
    content = f.read()

search_str = """
        const warnings = suggestions.filter(
          (s) => s.includes("ไม่สามารถ") || s.includes("Error"),
        );
        if (warnings.length > 0) {
          item.log = `เสร็จสิ้น (แจ้งเตือน: ${warnings[0]})`;
          item.warning = warnings[0];
        } else {
          item.log = "เสร็จสิ้น";
        }
"""

replace_str = """
        const warnings = suggestions.filter(
          (s) => s.includes("ไม่สามารถ") || s.includes("Error"),
        );

        let finalWarning = null;
        if (warnings.length > 0) {
            finalWarning = warnings[0];
        } else if (item.warning) {
            finalWarning = item.warning;
        }

        if (finalWarning) {
          item.log = `เสร็จสิ้น (แจ้งเตือน: ${finalWarning})`;
          item.warning = finalWarning;
        } else {
          item.log = "เสร็จสิ้น";
        }
"""

content = content.replace(search_str, replace_str)

with open('src/views/BatchAutomation.vue', 'w') as f:
    f.write(content)
