export const mandatoryStoreKeys = {
    // Fields that map directly to store.customer or store.transactionData properties
    fields: [
        // Request Info
        'contact_person',
        'contact_position',
        'contact_phone_number',
        'amount', // creditAmount
        'reason', // creditReason
        'billing_requirement',
        'payment_method',

        // General Info
        'name', // Company Name
        'authorized_person', // Authorized Signatory 1
        'authorized_position',
        'business_type',
        'main_products',
        'years_in_business',

        // Residence & Store (shared keys logic, or specific keys)
        // Note: For 'Store', if it's individual, we often use store_address, etc.
        // But the primary Residence address uses these keys.
        'address', // houseAddress
        'subdistrict',
        'zipcode', // postCode
        'district',
        'province', // city
        'phone',
        'location_type',
        'property_ownership'
    ],
    // Files mapping to store.files keys
    files: {
        common: [
            'credit_application_doc', // Request Info
            'id_card', // General Info
            'home_reg', // General Info
            'home_photo', // Residence
            'bank_statement' // Financial
        ],
        company: [
            'legal_entity_certificate',
            'vat_document',
            'company_photo'
            // Removed: company_land_tax
        ],
        individual: [
            'store_photo'
            // Removed: commercial_reg, store_land_tax
        ]
    }
};

// Helper to get all mandatory keys for a given customer type
export function getMandatoryKeys(isCompany) {
    const fileKeys = [
        ...mandatoryStoreKeys.files.common,
        ...(isCompany ? mandatoryStoreKeys.files.company : mandatoryStoreKeys.files.individual)
    ];

    return {
        fields: mandatoryStoreKeys.fields,
        files: fileKeys
    };
}
