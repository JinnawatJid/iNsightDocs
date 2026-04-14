import re

with open('src/views/BatchAutomation.vue', 'r') as f:
    content = f.read()

# Add Navbar import
if 'import Navbar from "@/components/shared/Navbar.vue";' not in content:
    content = content.replace('import { ref, reactive, computed, watch, onMounted } from "vue";',
                              'import { ref, reactive, computed, watch, onMounted } from "vue";\nimport Navbar from "@/components/shared/Navbar.vue";')

# Add Navbar component
if '<Navbar />' not in content:
    content = content.replace('<template>', '<template>\n  <Navbar />')

# Add padding
if 'padding-top: 80px;' not in content:
    content = content.replace('.batch-automation-container {\n  padding: 20px;\n  max-width: 1200px;\n  margin: 0 auto;\n}',
                              '.batch-automation-container {\n  padding: 20px;\n  padding-top: 100px; /* Navbar height + some extra */\n  max-width: 1200px;\n  margin: 0 auto;\n}')

with open('src/views/BatchAutomation.vue', 'w') as f:
    f.write(content)
