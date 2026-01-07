export const mandatoryStoreKeys = {
    // Fields that map directly to store.customer or store.transactionData properties
    fields: [
        // Request Info
        'contact_person',
        'contact_position',
        'contact_phone_number',
        'amount', // creditAmount
        'reason', // creditReason

        // General Info
        'name', // Company Name
        'authorized_person', // Authorized Signatory 1
        'authorized_position',

        // Residence
        'address', // houseAddress
        'subdistrict',
        'zipcode', // postCode
        'district',
        'province', // city
        'phone'
    ],
    // Files mapping to store.files keys
    files: {
        common: [
            'credit_application_doc', // Request Info
            'id_card', // General Info
            'home_reg', // General Info
            'home_photo', // Residence
            'land_tax', // Residence
            'bank_statement' // Financial
        ],
        company: [
            'legal_entity_certificate',
            'vat_document',
            'company_photo',
            'company_land_tax'
        ],
        individual: [
            'store_photo',
            'commercial_reg',
            'store_land_tax'
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
