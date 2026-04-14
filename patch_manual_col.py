import re

with open('src/views/BatchAutomation.vue', 'r') as f:
    content = f.read()

# Add to state variables:
# const rawExcelData = ref(null);
# const excelHeaders = ref([]);
# const selectedIdColumn = ref("");
# const showColumnMapping = ref(false);

state_vars_str = """
const activeWorkers = ref(0);
const bridgeHost = ref(localStorage.getItem("bridgeHost") || "localhost");
const bridgeStatus = ref("ไม่ทราบสถานะ");
const isExportDropdownOpen = ref(false); // State for dropdown

// Excel Upload State
const rawExcelData = ref(null);
const excelHeaders = ref([]);
const selectedIdColumn = ref("");
const showColumnMapping = ref(false);
"""
content = re.sub(r'const activeWorkers = ref\(0\);\nconst bridgeHost = ref\(localStorage\.getItem\("bridgeHost"\) \|\| "localhost"\);\nconst bridgeStatus = ref\("ไม่ทราบสถานะ"\);\nconst isExportDropdownOpen = ref\(false\); // State for dropdown', state_vars_str.strip(), content)

# Modify processFile to load raw data and show mapping UI
processFile_replacement = """
const processFile = (file) => {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลในไฟล์ Excel", "error");
      return;
    }

    rawExcelData.value = jsonData;
    excelHeaders.value = Object.keys(jsonData[0]);

    // Smart detection of ID column
    const bestMatch = findBestIdColumn(jsonData);
    if (bestMatch) {
      selectedIdColumn.value = bestMatch;
    } else if (excelHeaders.value.length > 0) {
      selectedIdColumn.value = excelHeaders.value[0];
    }

    showColumnMapping.value = true;
  };
  reader.readAsArrayBuffer(file);
};

const confirmColumnMapping = () => {
  if (!selectedIdColumn.value || !rawExcelData.value) return;

  const idKey = selectedIdColumn.value;

  // Map to Queue Format
  queue.value = rawExcelData.value
    .map((row) => {
      const id = row[idKey];
      const name = String(row["ชื่อลูกค้า"] || row["Name"] || "").trim();
      const corporateKeywords = [
        "บริษัท",
        "ห้างหุ้นส่วน",
        "บ.",
        "หจก.",
        "ltd",
        "limited",
        "co.",
        "plc",
        "corp",
        "inc",
        "company",
      ];
      const isCompany = corporateKeywords.some((k) =>
        name.toLowerCase().includes(k),
      );
      return {
        customerId: String(id || "").trim(),
        name: name,
        taxId: "",
        totalPurchase3Months: 0,
        latePaymentAverage: null,
        wadlScore: null,
        currentLimit: 0,
        paymentTerms: "",
        billingTerms: "",
        newLimit: null,
        score: null,
        grade: "",
        status: "Pending",
        log: "",
        files: {}, // to store downloaded blobs
        debugFiles: null, // to store file metadata for debug
        isCompany: isCompany,
        isReady: false,
        isNoFinancialData: false,
        analysisResult: null,
        modelType: null, // Store model type for report
        limitExponent: null, // Store limit exponent for report
      };
    })
    .filter((i) => i.customerId && i.customerId !== "undefined"); // Filter empty rows

  Swal.fire(
    "โหลดข้อมูลสำเร็จ",
    `โหลดรายชื่อลูกค้า ${queue.value.length} รายการ (ใช้คอลัมน์: ${idKey})`,
    "success",
  );

  showColumnMapping.value = false;
  rawExcelData.value = null; // Clear raw data after mapping
};

const cancelColumnMapping = () => {
  showColumnMapping.value = false;
  rawExcelData.value = null;
  excelHeaders.value = [];
  selectedIdColumn.value = "";
  // Reset file input
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) fileInput.value = "";
};
"""

content = re.sub(r'const processFile = \(file\) => \{[\s\S]*?(?=\n// --- Bridge Logic ---)', processFile_replacement.strip() + '\n\n', content)

with open('src/views/BatchAutomation.vue', 'w') as f:
    f.write(content)
