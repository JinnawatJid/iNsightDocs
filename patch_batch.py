import re

with open('src/views/BatchAutomation.vue', 'r') as f:
    content = f.read()

# 1. Replace the throw Error with setting a flag and warning
search_str = """
      if (!isCorporate) {
        item.log = "ข้าม DBD (ไม่ใช่บริษัท)";
        skipDBD = true;
      } else if (!item.taxId || String(item.taxId).trim().length !== 13) {
        throw new Error("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง/ไม่พบ");
      }
"""

replace_str = """
      let isInvalidTaxId = false;
      if (!isCorporate) {
        item.log = "ข้าม DBD (ไม่ใช่บริษัท)";
        skipDBD = true;
      } else if (!item.taxId || String(item.taxId).trim().length !== 13) {
        item.log = "เลขผู้เสียภาษีไม่ถูกต้อง (ตรวจสอบไฟล์ Local)";
        item.warning = "เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง/ไม่พบ";
        isInvalidTaxId = true;
      }
"""

content = content.replace(search_str, replace_str)


# 2. Skip bridge download if isInvalidTaxId
search_str2 = """
      // Step 2: Download from Bridge (Retry Logic) - Only if not skipped AND not local
      // Fallback directly if the initial bridge request failed.
      if (!skipDBD && !useLocalFiles) {
        item.log = "กำลังดาวน์โหลดไฟล์ DBD...";
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries && !downloadResult) {
          try {
            downloadResult = await connectToBridge(item.taxId, item.customerId);
          } catch (e) {
            retries++;
            if (retries > maxRetries) {
              console.warn("Bridge failed, proceeding with fallback");
            } else {
              item.log = `ลองใหม่ DBD (${retries}/${maxRetries})...`;
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
        }
      }
"""

replace_str2 = """
      // Step 2: Download from Bridge (Retry Logic) - Only if not skipped AND not local
      // Fallback directly if the initial bridge request failed.
      if (!skipDBD && !useLocalFiles) {
        if (isInvalidTaxId) {
          item.log = "ข้าม DBD (เลขผู้เสียภาษีไม่ถูกต้อง/ไม่มีไฟล์ Local)";
        } else {
          item.log = "กำลังดาวน์โหลดไฟล์ DBD...";
          let retries = 0;
          const maxRetries = 2;

          while (retries <= maxRetries && !downloadResult) {
            try {
              downloadResult = await connectToBridge(item.taxId, item.customerId);
            } catch (e) {
              retries++;
              if (retries > maxRetries) {
                console.warn("Bridge failed, proceeding with fallback");
              } else {
                item.log = `ลองใหม่ DBD (${retries}/${maxRetries})...`;
                await new Promise((r) => setTimeout(r, 2000));
              }
            }
          }
        }
      }
"""

content = content.replace(search_str2, replace_str2)


# 3. Handle missing downloadResult in prepare logic
search_str3 = """
        if (!skipDBD) {
          if (!downloadResult) {
            throw new Error("ดาวน์โหลด DBD ไม่สำเร็จ (กรุณาลองใหม่)");
          }

          const required = [
            "profile",
            "balanceSheet",
            "incomeStatement",
            "financialRatios",
          ];
          const missing = required.filter((k) => !downloadResult.files[k]);
          if (missing.length > 0) {
            const names = {
              profile: "Company Profile",
              balanceSheet: "งบดุล",
              incomeStatement: "งบกำไรขาดทุน",
              financialRatios: "อัตราส่วนทางการเงิน",
            };
            const missingNames = missing.map((k) => names[k] || k).join(", ");
            throw new Error(`DBD ไม่ครบ: ขาด ${missingNames}`);
          }
        }
"""

replace_str3 = """
        if (!skipDBD) {
          if (!downloadResult) {
            if (isInvalidTaxId) {
              // Proceed without throwing, fallback will be used
            } else {
              throw new Error("ดาวน์โหลด DBD ไม่สำเร็จ (กรุณาลองใหม่)");
            }
          } else {
            const required = [
              "profile",
              "balanceSheet",
              "incomeStatement",
              "financialRatios",
            ];
            const missing = required.filter((k) => !downloadResult.files[k]);
            if (missing.length > 0) {
              const names = {
                profile: "Company Profile",
                balanceSheet: "งบดุล",
                incomeStatement: "งบกำไรขาดทุน",
                financialRatios: "อัตราส่วนทางการเงิน",
              };
              const missingNames = missing.map((k) => names[k] || k).join(", ");
              throw new Error(`DBD ไม่ครบ: ขาด ${missingNames}`);
            }
          }
        }
"""

content = content.replace(search_str3, replace_str3)

# 4. Handle item.dbdCompanyName condition which relies on downloadResult
search_str4 = """
        // Step 3: Trigger the upload and extraction process on the backend
        // once files are confirmed to be downloaded or already exist locally.
        if (downloadResult) {
"""

replace_str4 = """
        // Step 3: Trigger the upload and extraction process on the backend
        // once files are confirmed to be downloaded or already exist locally.
        if (downloadResult) {
"""
# Nothing to change here, but let's double check what happens if !downloadResult.
# The code has:
#         if (downloadResult) {
#            ...
#         } else {
#           item.log = "ใช้ข้อมูลภายใน (ข้าม DBD)...";
#           if (customer.customer.customer_since) {
#             ...
#           }
#         }
# So if downloadResult is null (because isInvalidTaxId is true), it will enter the `else` block
# and correctly log "ใช้ข้อมูลภายใน (ข้าม DBD)..." and set yearsInBusiness. This is exactly what we want!

with open('src/views/BatchAutomation.vue', 'w') as f:
    f.write(content)
