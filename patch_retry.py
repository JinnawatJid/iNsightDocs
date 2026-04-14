import re

with open('src/views/BatchAutomation.vue', 'r') as f:
    content = f.read()

# Add retry UI button
retry_btn_html = """
      <button
        class="btn-outline-danger"
        @click="stopBatch"
        :disabled="!isProcessing"
      >
        หยุด
      </button>

      <button
        class="btn-warning-upload"
        @click="retryFailed"
        v-if="hasErrorItems"
        :disabled="isProcessing"
      >
        ลองใหม่ที่ผิดพลาด
      </button>
"""
content = content.replace("""
      <button
        class="btn-outline-danger"
        @click="stopBatch"
        :disabled="!isProcessing"
      >
        หยุด
      </button>
""", retry_btn_html)

# Add computed property hasErrorItems and retryFailed method
computed_html = """
// Computed
const processedCount = computed(() => {
  return queue.value.filter((i) =>
    ["Done", "Done (Int)", "Error", "Skipped"].includes(i.status),
  ).length;
});

const hasErrorItems = computed(() => {
  return queue.value.some((i) => i.status === "Error");
});
"""
content = content.replace("""
// Computed
const processedCount = computed(() => {
  return queue.value.filter((i) =>
    ["Done", "Done (Int)", "Error", "Skipped"].includes(i.status),
  ).length;
});
""", computed_html)

methods_html = """
const retryFailed = () => {
  const errorItems = queue.value.filter((i) => i.status === "Error");
  if (errorItems.length === 0) return;

  errorItems.forEach((item) => {
    item.status = "Pending";
    item.log = "รอคิว (Retry)";
  });

  startBatch();
};

// Worker function to process items one by one from the shared queue
"""
content = content.replace("// Worker function to process items one by one from the shared queue", methods_html)

with open('src/views/BatchAutomation.vue', 'w') as f:
    f.write(content)
