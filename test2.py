from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content("""
<!DOCTYPE html>
<html>
<head>
<style>
.table-container {
  overflow: auto;
  max-height: 65vh;
  width: 500px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th, .data-table td {
  padding: 12px;
  border: 1px solid #eee;
}
.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  position: sticky;
  left: 170px;
}
</style>
</head>
<body>
<div class="table-container">
<table class="data-table">
  <thead>
    <tr><th>#</th><th>รหัสลูกค้า</th><th>ชื่อลูกค้า</th><th>Other</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>00001AY</td><td>บริษัท 168 อลูมิเนียม สุพรรณบุรี จำกัด</td><td>Content</td></tr>
  </tbody>
</table>
</div>
</body>
</html>
    """)
    box = page.locator(".data-table td:nth-child(3)").bounding_box()
    print("No table-layout fixed Bounding box width:", box["width"])

    page.set_content("""
<!DOCTYPE html>
<html>
<head>
<style>
.table-container {
  overflow: auto;
  max-height: 65vh;
  width: 500px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.data-table th, .data-table td {
  padding: 12px;
  border: 1px solid #eee;
}
.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  position: sticky;
  left: 170px;
}
</style>
</head>
<body>
<div class="table-container">
<table class="data-table">
  <thead>
    <tr><th>#</th><th>รหัสลูกค้า</th><th>ชื่อลูกค้า</th><th>Other</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>00001AY</td><td>บริษัท 168 อลูมิเนียม สุพรรณบุรี จำกัด</td><td>Content</td></tr>
  </tbody>
</table>
</div>
</body>
</html>
    """)
    box = page.locator(".data-table td:nth-child(3)").bounding_box()
    print("Table-layout fixed Bounding box width:", box["width"])
    browser.close()
