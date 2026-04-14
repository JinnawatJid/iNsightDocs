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

    // General Info Tab (ข้อมูลทั่วไป)
    'name': { label: 'ชื่อบริษัท/ร้านค้า', tab: 'ข้อมูลทั่วไป' },
    'authorized_person': { label: 'ผู้มีอำนาจลงนาม', tab: 'ข้อมูลทั่วไป' },
    'authorized_position': { label: 'ตำแหน่งผู้มีอำนาจลงนาม', tab: 'ข้อมูลทั่วไป' },
    'business_type': { label: 'ประเภทธุรกิจ', tab: 'ข้อมูลทั่วไป' },
    'main_products': { label: 'สินค้าหลัก', tab: 'ข้อมูลทั่วไป' },
    'years_in_business': { label: 'ระยะเวลาดำเนินกิจการ (ปี)', tab: 'ข้อมูลทั่วไป' },
    'customer_duration_years': { label: 'ระยะเวลาที่ทำธุรกิจกับลูกค้า', tab: 'ข้อมูลทั่วไป' },
    'registered_capital': { label: 'ทุนจดทะเบียน', tab: 'ข้อมูลทั่วไป' },

    // Residence Tab (ข้อมูลที่อยู่ / ทะเบียนบ้าน)
    'address': { label: 'ที่อยู่/บ้านเลขที่', tab: 'ข้อมูลที่อยู่' },
    'subdistrict': { label: 'แขวง/ตำบล', tab: 'ข้อมูลที่อยู่' },
    'zipcode': { label: 'รหัสไปรษณีย์', tab: 'ข้อมูลที่อยู่' },
    'district': { label: 'เขต/อำเภอ', tab: 'ข้อมูลที่อยู่' },
    'province': { label: 'จังหวัด', tab: 'ข้อมูลที่อยู่' },
    'phone': { label: 'เบอร์โทรศัพท์ร้าน', tab: 'ข้อมูลที่อยู่' },
    'residence_location_type': { label: 'ลักษณะที่ตั้ง', tab: 'ข้อมูลที่อยู่' },
    'residence_ownership': { label: 'กรรมสิทธิ์', tab: 'ข้อมูลที่อยู่' },
    'residence_value': { label: 'มูลค่า (บาท)', tab: 'ข้อมูลที่อยู่' },

    // Store Tab (ข้อมูลร้านค้า)
    'store_location_type': { label: 'ลักษณะที่ตั้ง', tab: 'ข้อมูลร้านค้า' },
    'store_ownership': { label: 'กรรมสิทธิ์', tab: 'ข้อมูลร้านค้า' },
    'store_value': { label: 'มูลค่า (บาท)', tab: 'ข้อมูลร้านค้า' }
};

export const docLabels = {
    // Other Docs normally grouped loosely by tab, but let's specify where they upload
    'credit_application_doc': { label: 'เอกสารคำขอ', tab: 'เงื่อนไขและคำขอ' },
    'id_card': { label: 'บัตรประชาชน', tab: 'ข้อมูลทั่วไป' },
    'home_reg': { label: 'ทะเบียนบ้าน', tab: 'ข้อมูลทั่วไป' },
    'home_photo': { label: 'รูปที่อยู่', tab: 'ข้อมูลที่อยู่' },
    'store_photo': { label: 'รูปหน้าร้าน', tab: 'ข้อมูลร้านค้า' },
    'map': { label: 'แผนที่', tab: 'ข้อมูลร้านค้า' },
    'bank_statement': { label: 'Statement', tab: 'งบการเงิน / Statement' },
    'legal_entity_certificate': { label: 'หนังสือรับรอง', tab: 'ข้อมูลทั่วไป' },
    'vat_document': { label: 'ภพ.20', tab: 'ข้อมูลทั่วไป' },
    'company_photo': { label: 'รูปบริษัท', tab: 'ข้อมูลทั่วไป' },
    'company_profile_doc': { label: 'Company Profile', tab: 'งบการเงิน / Statement' },
    'balance_sheet_doc': { label: 'งบดุล', tab: 'งบการเงิน / Statement' },
    'profit_loss_doc': { label: 'งบกำไรขาดทุน', tab: 'งบการเงิน / Statement' },
    'financial_ratios_doc': { label: 'อัตราส่วนทางการเงิน', tab: 'งบการเงิน / Statement' },
    'quotation_doc': { label: 'ใบสั่งซื้อ/ใบเสนอราคา', tab: 'เงื่อนไขและคำขอ' }
};
