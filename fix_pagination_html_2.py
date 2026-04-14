import re

with open('src/views/BatchAutomation.vue', 'r') as f:
    content = f.read()

# Make sure the table HTML ends properly and the pagination controls are inside the .table-container or outside it properly.
if '<div class="pagination-controls"' not in content:
    # Find the end of table container
    table_end = """      </table>
    </div>"""

    pagination_ui_html = """      </table>
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
    </div>"""

    content = content.replace(table_end, pagination_ui_html)

with open('src/views/BatchAutomation.vue', 'w') as f:
    f.write(content)
