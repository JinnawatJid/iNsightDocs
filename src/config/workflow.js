// Workflow Configuration for Credit Request Status Transitions

export const workflowConfig = {
    // Branch Manager (Start)
    'Draft': [
        {
            label: 'Save',
            action: 'saveDraft',
            variant: 'secondary', // Grey button
            targetStatus: 'Draft',
            confirmMessage: 'บันทึกสำเร็จ'
        },
        {
            label: 'ส่งคำขอ',
            action: 'submit',
            variant: 'primary', // Blue button
            targetStatus: 'Opened',
            confirmText: 'ส่งคำขอให้ผู้จัดการภาค',
            confirmMessage: 'ทำรายการสำเร็จ'
        }
    ],
    // Regional Manager
    'Opened': [
        {
            label: 'ส่งให้ฝ่ายขาย',
            action: 'submit',
            variant: 'submit', // Blue (Primary)
            targetStatus: 'RegionalSubmitted',
            confirmText: 'ส่งคำขอให้ฝ่ายขาย',
            confirmMessage: 'ทำรายการสำเร็จ'
        }
    ],
    // Sales Manager
    'RegionalSubmitted': [
        {
            label: 'ปฏิเสธ',
            action: 'reject',
            variant: 'reject', // Red
            targetStatus: 'Rejected',
            confirmText: 'ปฏิเสธคำขอ',
            confirmMessage: 'ปฏิเสธคำขอสำเร็จ'
        },
        {
            label: 'ส่งต่อให้ฝ่ายการเงิน',
            action: 'submit',
            variant: 'submit', // Blue
            targetStatus: 'SalesSubmitted',
            confirmText: 'ส่งต่อให้ฝ่ายการเงิน',
            confirmMessage: 'ทำรายการสำเร็จ'
        }
    ],
    // Finance Officer
    'SalesSubmitted': [
        {
            label: 'ปฏิเสธ',
            action: 'reject',
            variant: 'reject',
            targetStatus: 'Rejected',
            confirmText: 'ปฏิเสธคำขอ',
            confirmMessage: 'ปฏิเสธคำขอสำเร็จ'
        },
        {
            label: 'ส่งต่อให้ผู้จัดการฝ่ายการเงิน',
            action: 'submit',
            variant: 'submit',
            targetStatus: 'Reviewed',
            confirmText: 'ส่งต่อให้ผู้จัดการฝ่ายการเงิน',
            confirmMessage: 'ทำรายการสำเร็จ'
        }
    ],
    // Finance Manager / Credit Committee (Reviewed)
    'Reviewed': [
        {
            label: 'ปฏิเสธ',
            action: 'reject',
            variant: 'reject',
            targetStatus: 'Rejected',
            confirmText: 'ปฏิเสธคำขอ',
            confirmMessage: 'ปฏิเสธคำขอสำเร็จ'
        },
        // Both High and Low value lead to Approved, but strictly by different roles (checked in component)
        {
            label: 'อนุมัติคำขอ',
            action: 'approve',
            variant: 'approve', // Green
            targetStatus: 'Approved',
            confirmText: 'อนุมัติคำขอ',
            confirmMessage: 'อนุมัติคำขอสำเร็จ'
        }
    ]
};

export const roleLabels = {
    'Draft': 'ผู้จัดการสาขา',
    'Opened': 'ผู้จัดการภาค',
    'RegionalSubmitted': 'ผู้จัดการฝ่ายขาย',
    'SalesSubmitted': 'เจ้าหน้าที่ฝ่ายการเงิน',
    'Reviewed': 'ผู้จัดการฝ่ายการเงิน / กรรมการเครดิต',
    'Approved': 'อนุมัติแล้ว',
    'Rejected': 'ปฏิเสธ',
    'Canceled': 'ยกเลิกแล้ว',
    'Closed': 'ปิดงานแล้ว',

    // Legacy Support
    'Submitted': 'ผู้จัดการฝ่ายขาย (Legacy)',
    'PendingSales (ชั่วคราว)': 'เจ้าหน้าที่ฝ่ายการเงิน (Legacy)',
    'PendingFinance (ชั่วคราว)': 'กรรมการเครดิต (Legacy)'
};

export const commentPlaceholders = {
    'Draft': 'ระบุวัตถุประสงค์การขอเครดิต, ประวัติลูกค้า, และรายละเอียดโครงการเพื่อประกอบการพิจารณา...',
    'Opened': 'ระบุความเห็นเพิ่มเติมสำหรับการพิจารณาของผู้จัดการภาค...',
    'RegionalSubmitted': 'ระบุศักยภาพของลูกค้า, ปริมาณการซื้อขายที่คาดหวัง, หรือความจำเป็นทางธุรกิจ...',
    'SalesSubmitted': 'ระบุผลการตรวจสอบเอกสาร, ความครบถ้วนของข้อมูล, หรือประเด็นที่ต้องตรวจสอบเพิ่มเติม...',
    'Reviewed': 'วิเคราะห์ความเสี่ยง, ประวัติการชำระเงิน, และข้อเสนอแนะทางการเงิน...'
};
