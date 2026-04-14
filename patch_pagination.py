import re

with open('src/views/BatchAutomation.vue', 'r') as f:
    content = f.read()

# Add to state variables:
state_vars_str = """
const activeWorkers = ref(0);
const bridgeHost = ref(localStorage.getItem("bridgeHost") || "localhost");
const bridgeStatus = ref("ไม่ทราบสถานะ");
const isExportDropdownOpen = ref(false); // State for dropdown

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(100);
"""
content = re.sub(r'const activeWorkers = ref\(0\);\nconst bridgeHost = ref\(localStorage\.getItem\("bridgeHost"\) \|\| "localhost"\);\nconst bridgeStatus = ref\("ไม่ทราบสถานะ"\);\nconst isExportDropdownOpen = ref\(false\); // State for dropdown', state_vars_str.strip(), content)

# Modify computed property for paginatedQueue
computed_html = """
const hasErrorItems = computed(() => {
  return queue.value.some((i) => i.status === "Error");
});

const totalPages = computed(() => {
  return Math.ceil(queue.value.length / itemsPerPage.value) || 1;
});

const paginatedQueue = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return queue.value.slice(start, end);
});
"""
content = content.replace("""
const hasErrorItems = computed(() => {
  return queue.value.some((i) => i.status === "Error");
});
""", computed_html)

# Add watch to reset currentPage if queue changes
watch_html = """
watch(queue, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = 1;
  }
});
"""
content = re.sub(r'// Watch bridge host to save\nwatch\(bridgeHost, \(val\) => \{\n  localStorage\.setItem\("bridgeHost", val\);\n\}\);',
                 '// Watch bridge host to save\nwatch(bridgeHost, (val) => {\n  localStorage.setItem("bridgeHost", val);\n});\n' + watch_html, content)

# Modify the table v-for
table_vfor_orig = """<tr
            v-for="(item, index) in queue"
            :key="index"
            :class="getRowClass(item)"
          >
            <td>{{ index + 1 }}</td>"""

table_vfor_new = """<tr
            v-for="(item, index) in paginatedQueue"
            :key="item.customerId || index"
            :class="getRowClass(item)"
          >
            <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>"""
content = content.replace(table_vfor_orig, table_vfor_new)

# Add Pagination UI below the table
pagination_ui_html = """
    </div>

    <!-- Pagination Controls -->
    <div class="pagination-controls" v-if="queue.length > 0">
      <div class="pagination-info">
        แสดง {{ (currentPage - 1) * itemsPerPage + 1 }} ถึง
        {{ Math.min(currentPage * itemsPerPage, queue.length) }}
        จากทั้งหมด {{ queue.length }} รายการ
      </div>

      <div class="pagination-actions">
        <label>แสดงหน้าละ:</label>
        <select v-model="itemsPerPage" @change="currentPage = 1" class="form-control" style="width: 80px; display: inline-block; margin-right: 20px;">
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
          <option :value="500">500</option>
        </select>

        <button class="btn-secondary btn-sm" @click="currentPage--" :disabled="currentPage === 1">ก่อนหน้า</button>
        <span class="page-text">หน้า {{ currentPage }} / {{ totalPages }}</span>
        <button class="btn-secondary btn-sm" @click="currentPage++" :disabled="currentPage >= totalPages">ถัดไป</button>
      </div>
    </div>
  </div>
"""

content = content.replace("""
    </div>
  </div>

  <!-- Column Mapping Modal -->
""", pagination_ui_html + "\n  <!-- Column Mapping Modal -->\n")

# Add pagination styles
pagination_styles = """
.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #fff;
  border: 1px solid #ddd;
  border-top: none;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.pagination-info {
  color: #666;
  font-size: 0.9em;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-actions label {
  margin-bottom: 0;
  color: #555;
}

.page-text {
  font-weight: 500;
  color: #333;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 0.9em;
}
"""

content = content.replace("</style>", pagination_styles + "\n</style>")

with open('src/views/BatchAutomation.vue', 'w') as f:
    f.write(content)
