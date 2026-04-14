import re

with open('src/components/shared/Navbar.vue', 'r') as f:
    content = f.read()

# Add link to navbar
link_html = """
      <router-link v-if="authStore.isFinanceOfficer" to="/batch-automation" class="nav-link">ระบบคำนวณวงเงินอัตโนมัติ</router-link>"""

if 'to="/batch-automation"' not in content:
    content = content.replace('<router-link to="/pending-requests" class="nav-link">คำขอทั้งหมด</router-link>',
                              '<router-link to="/pending-requests" class="nav-link">คำขอทั้งหมด</router-link>' + link_html)

with open('src/components/shared/Navbar.vue', 'w') as f:
    f.write(content)
