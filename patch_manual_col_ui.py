import re

with open('src/views/BatchAutomation.vue', 'r') as f:
    content = f.read()

# Add UI for column mapping modal/teleport
modal_html = """
  <!-- Column Mapping Modal -->
  <Teleport to="body">
    <div v-if="showColumnMapping" class="modal-overlay" @click.self="cancelColumnMapping">
      <div class="modal-content">
        <h3 class="modal-title">เลือกคอลัมน์รหัสลูกค้า</h3>
        <p class="modal-subtitle">กรุณาเลือกคอลัมน์ที่ตรงกับ "รหัสลูกค้า" (Customer ID)</p>

        <div class="modal-body">
          <div class="form-group">
            <label>คอลัมน์รหัสลูกค้า:</label>
            <select v-model="selectedIdColumn" class="form-control" style="font-size: 1em; padding: 10px;">
              <option v-for="col in excelHeaders" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="cancelColumnMapping">ยกเลิก</button>
          <button class="btn-submit" @click="confirmColumnMapping" :disabled="!selectedIdColumn">ยืนยัน</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Custom Upload Modal (Teleported to body to avoid z-index issues) -->
"""

content = content.replace('  <!-- Custom Upload Modal (Teleported to body to avoid z-index issues) -->', modal_html)

with open('src/views/BatchAutomation.vue', 'w') as f:
    f.write(content)
