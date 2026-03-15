import re

filepath = "src/views/CreateCreditRequest.vue"

with open(filepath, "r") as f:
    content = f.read()

# Add onMounted to vue imports
if "from 'vue';" in content and "onMounted" not in content:
    content = re.sub(r"import\s+\{(.*?)\}\s+from\s+'vue';", lambda m: f"import {{{m.group(1)}, onMounted}} from 'vue';", content)
elif "from 'vue';" not in content:
    content = content.replace("import { ref, watch } from 'vue';", "import { ref, watch, onMounted } from 'vue';")

# Add onMounted hook
script_section = """
const closePreview = () => {
    store.resetState();
    isRequestStarted.value = false;
};

onMounted(() => {
    // Reset state when visiting the page to ensure a clean slate
    store.resetState();
    isRequestStarted.value = false;
});
"""

content = content.replace("""
const closePreview = () => {
    store.resetState();
    isRequestStarted.value = false;
};
""", script_section)

with open(filepath, "w") as f:
    f.write(content)

print("Updated Vue file.")
