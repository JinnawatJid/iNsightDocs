// Workflow Configuration for Credit Request Status Transitions

export const workflowConfig = {
    // Office Manager (Start)
    'Draft': [
        {
            label: 'บันทึกแบบร่าง',
            action: 'saveDraft',
            variant: 'secondary', // Grey button
            targetStatus: 'Draft',
            confirmMessage: 'บันทึกแบบร่างสำเร็จ'
        },
        {
            label: 'ส่งคำขอ',
            action: 'submit',
            variant: 'primary', // Blue button
            targetStatus: 'Opened',
            confirmText: 'ส่งคำขอให้ผู้จัดการสาขา',
            confirmMessage: 'ทำรายการสำเร็จ'
        }
    ],
    // Branch Manager
    'Opened': [
        {
            label: 'ส่งให้ฝ่ายขาย (HO)',
            action: 'submit',
            variant: 'submit', // Blue (Primary)
            targetStatus: 'Submitted',
            confirmText: 'ส่งคำขอให้ฝ่ายขาย (HO)',
            confirmMessage: 'ทำรายการสำเร็จ'
        }
    ],
    // Sales Manager
    'Submitted': [
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
            targetStatus: 'PendingSales (ชั่วคราว)',
            confirmText: 'ส่งต่อให้ฝ่ายการเงิน',
            confirmMessage: 'ทำรายการสำเร็จ'
        }
    ],
    // Finance Officer
    'PendingSales (ชั่วคราว)': [
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
    // Finance Manager
    'Reviewed': [
        {
            label: 'ปฏิเสธ',
            action: 'reject',
            variant: 'reject',
            targetStatus: 'Rejected',
            confirmText: 'ปฏิเสธคำขอ',
            confirmMessage: 'ปฏิเสธคำขอสำเร็จ'
        },
        // Logic for High Value (>300k) vs Low Value is handled in the Component
        // We define both potential paths here, and the component will filter/select based on logic
        {
            label: 'ส่งต่อให้กรรมการเครดิต',
            action: 'submit',
            variant: 'submit',
            targetStatus: 'PendingFinance (ชั่วคราว)',
            condition: 'isHighValue', // Flag for component to check
            confirmText: 'ส่งต่อให้กรรมการเครดิต',
            confirmMessage: 'ทำรายการสำเร็จ'
        },
        {
            label: 'อนุมัติคำขอ',
            action: 'approve',
            variant: 'approve', // Green
            targetStatus: 'Approved',
            condition: 'isLowValue', // Flag for component to check
            confirmText: 'อนุมัติคำขอ',
            confirmMessage: 'อนุมัติคำขอสำเร็จ'
        }
    ],
    // Credit Committee
    'PendingFinance (ชั่วคราว)': [
        {
            label: 'ปฏิเสธ',
            action: 'reject',
            variant: 'reject',
            targetStatus: 'Rejected',
            confirmText: 'ปฏิเสธคำขอ',
            confirmMessage: 'ปฏิเสธคำขอสำเร็จ'
        },
        {
            label: 'อนุมัติคำขอ',
            action: 'approve',
            variant: 'approve',
            targetStatus: 'Approved',
            confirmText: 'อนุมัติคำขอ',
            confirmMessage: 'อนุมัติคำขอสำเร็จ'
        }
    ]
};

export const roleLabels = {
    'Draft': 'หัวหน้าสำนักงาน',
    'Opened': 'ผู้จัดการสาขา',
    'Submitted': 'ผู้จัดการฝ่ายขาย (HO)',
    'PendingSales (ชั่วคราว)': 'เจ้าหน้าที่ฝ่ายการเงิน',
    'Reviewed': 'ผู้จัดการฝ่ายการเงิน',
    'PendingFinance (ชั่วคราว)': 'กรรมการเครดิต',
    'Approved': 'อนุมัติแล้ว',
    'Rejected': 'ปฏิเสธ',
    'Canceled': 'ยกเลิกแล้ว',
    'Closed': 'ปิดงานแล้ว'
};
