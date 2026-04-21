export const fieldLabels = {
    // Request Info Tab (เงื่อนไขและคำขอ)
    'amount': { label: 'วงเงินที่ขอ', tab: 'เงื่อนไขและคำขอ' },
    'reason': { label: 'เหตุผล', tab: 'เงื่อนไขและคำขอ' },
    'contact_person': { label: 'ชื่อผู้ติดต่อ', tab: 'เงื่อนไขและคำขอ' },
    'contact_position': { label: 'ตำแหน่งผู้ติดต่อ', tab: 'เงื่อนไขและคำขอ' },
    'contact_phone_number': { label: 'เบอร์โทรผู้ติดต่อ', tab: 'เงื่อนไขและคำขอ' },
    'payment_method': { label: 'วิธีชำระเงิน', tab: 'เงื่อนไขและคำขอ' },
    'billing_requirement': { label: 'เงื่อนไขวางบิล', tab: 'เงื่อนไขและคำขอ' },
    'billing_method': { label: 'ช่องทางวางบิล', tab: 'เงื่อนไขและคำขอ' },
    'billing_schedule': { label: 'รอบวางบิล', tab: 'เงื่อนไขและคำขอ' },
    'payment_condition': { label: 'เงื่อนไขชำระเงิน', tab: 'เงื่อนไขและคำขอ' },
    'payment_bank_name': { label: 'ธนาคาร', tab: 'เงื่อนไขและคำขอ' },
    'payment_account_no': { label: 'เลขบัญชี', tab: 'เงื่อนไขและคำขอ' },
    'has_other_credit': { label: 'มีสินเชื่ออื่นหรือไม่', tab: 'เงื่อนไขและคำขอ' },
    'termGS': { label: 'Term GS', tab: 'เงื่อนไขและคำขอ' },
    'termAE': { label: 'Term AE', tab: 'เงื่อนไขและคำขอ' },
    'termYC': { label: 'Term YC', tab: 'เงื่อนไขและคำขอ' },

    // General Info Tab (ข้อมูลผู้มีอำนาจ)
    'name': { label: 'ชื่อบริษัท/ร้านค้า', tab: 'ข้อมูลผู้มีอำนาจ' },
    'authorized_person': { label: 'ผู้มีอำนาจลงนาม', tab: 'ข้อมูลผู้มีอำนาจ' },
    'authorized_position': { label: 'ตำแหน่งผู้มีอำนาจลงนาม', tab: 'ข้อมูลผู้มีอำนาจ' },
    'business_type': { label: 'ประเภทธุรกิจ', tab: 'ข้อมูลผู้มีอำนาจ' },
    'main_products': { label: 'สินค้าหลัก', tab: 'ข้อมูลผู้มีอำนาจ' },
    'years_in_business': { label: 'ระยะเวลาดำเนินกิจการ (ปี)', tab: 'ข้อมูลผู้มีอำนาจ' },
    'has_tungnam_relationship': { label: 'ความสัมพันธ์กับลูกค้ารายอื่นของตังน้ำ', tab: 'ข้อมูลผู้มีอำนาจ' },
    'customer_duration_years': { label: 'ระยะเวลาการเป็นลูกค้า', tab: 'เอกสารการเงิน' },
    'registered_capital': { label: 'ทุนจดทะเบียน', tab: 'เอกสารการเงิน' },

    // Residence Tab (ที่อยู่อาศัย)
    'address': { label: 'ที่อยู่/บ้านเลขที่', tab: 'ที่อยู่อาศัย' },
    'subdistrict': { label: 'แขวง/ตำบล', tab: 'ที่อยู่อาศัย' },
    'zipcode': { label: 'รหัสไปรษณีย์', tab: 'ที่อยู่อาศัย' },
    'district': { label: 'เขต/อำเภอ', tab: 'ที่อยู่อาศัย' },
    'province': { label: 'จังหวัด', tab: 'ที่อยู่อาศัย' },
    'phone': { label: 'เบอร์โทรศัพท์ร้าน', tab: 'ที่อยู่อาศัย' },
    'residence_location_type': { label: 'ลักษณะที่ตั้ง', tab: 'ที่อยู่อาศัย' },
    'residence_ownership': { label: 'กรรมสิทธิ์', tab: 'ที่อยู่อาศัย' },
    'residence_value': { label: 'มูลค่า (บาท)', tab: 'ที่อยู่อาศัย' },

    // Store Tab (ข้อมูลร้านค้า)
    'store_location_type': { label: 'ลักษณะที่ตั้ง', tab: 'ข้อมูลร้านค้า' },
    'store_ownership': { label: 'กรรมสิทธิ์', tab: 'ข้อมูลร้านค้า' },
    'store_value': { label: 'มูลค่า (บาท)', tab: 'ข้อมูลร้านค้า' }
};

export const docLabels = {
    // Other Docs normally grouped loosely by tab, but let's specify where they upload
    'credit_application_doc': { label: 'เอกสารคำขอ', tab: 'เงื่อนไขและคำขอ' },
    'id_card': { label: 'บัตรประชาชน', tab: 'ข้อมูลผู้มีอำนาจ' },
    'home_reg': { label: 'ทะเบียนบ้าน', tab: 'ข้อมูลผู้มีอำนาจ' },
    'home_photo': { label: 'รูปที่อยู่', tab: 'ที่อยู่อาศัย' },
    'store_photo': { label: 'รูปหน้าร้าน', tab: 'ข้อมูลบริษัท' },
    'map': { label: 'แผนที่', tab: 'ข้อมูลบริษัท' },
    'bank_statement': { label: 'Statement', tab: 'เอกสารการเงิน' },
    'legal_entity_certificate': { label: 'หนังสือรับรอง', tab: 'ข้อมูลผู้มีอำนาจ' },
    'vat_document': { label: 'ภพ.20', tab: 'ข้อมูลผู้มีอำนาจ' },
    'company_photo': { label: 'รูปบริษัท', tab: 'ข้อมูลผู้มีอำนาจ' },
    'company_profile_doc': { label: 'Company Profile', tab: 'เอกสารการเงิน' },
    'balance_sheet_doc': { label: 'งบดุล', tab: 'เอกสารการเงิน' },
    'profit_loss_doc': { label: 'งบกำไรขาดทุน', tab: 'เอกสารการเงิน' },
    'financial_ratios_doc': { label: 'อัตราส่วนทางการเงิน', tab: 'เอกสารการเงิน' },
    'quotation_doc': { label: 'ใบสั่งซื้อ/ใบเสนอราคา', tab: 'เงื่อนไขและคำขอ' }
};
