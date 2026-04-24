import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCreditRequestStore } from './creditRequest';

describe('CreditRequest Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('should validate financial files correctly for company', () => {
        const store = useCreditRequestStore();

        // Setup state to simulate a company
        store.customer = { name: 'บริษัท เทส จำกัด' }; // name makes isCompany = true
        store.transactionData = {
            amount: '1000',
            reason: 'test',
            requestType: 'เครดิตใหม่',
            contact_person: 'test',
            contact_phone_number: '0123456789',
            billing_requirement: 'test',
            payment_method: 'test'
        };
        // Adding other required fields...
        store.customer.address = '1';
        store.customer.subdistrict = '2';
        store.customer.zipcode = '3';
        store.customer.district = '4';
        store.customer.province = '5';
        store.customer.phone = '6';

        const validation = store.validateRequest(true, true);

        // Since no files are added, it should fail and complain about missing files
        expect(validation.valid).toBe(false);
        expect(validation.missingFiles).toContain('balance_sheet_doc');
        expect(validation.missingFiles).toContain('profit_loss_doc');
        expect(validation.missingFiles).toContain('financial_ratios_doc');
    });

    it('should NOT require financial files for individual', () => {
        const store = useCreditRequestStore();

        // Setup state to simulate an individual
        store.customer = { name: 'นาย เทส ดีงาม' }; // name makes isCompany = false
        store.transactionData = {
            amount: '1000',
            reason: 'test',
            requestType: 'เครดิตใหม่',
            contact_person: 'test',
            contact_phone_number: '0123456789',
            billing_requirement: 'test',
            payment_method: 'test'
        };

        const validation = store.validateRequest(true, true);

        // It shouldn't complain about balance_sheet_doc etc.
        expect(validation.valid).toBe(false); // Probably missing some other fields/files
        expect(validation.missingFiles).not.toContain('balance_sheet_doc');
        expect(validation.missingFiles).not.toContain('profit_loss_doc');
        expect(validation.missingFiles).not.toContain('financial_ratios_doc');
    });

    it('should include original data in getSnapshot', () => {
        const store = useCreditRequestStore();
        store.originalCustomer = { id: 'orig_cust' };
        store.originalInitiatorCustomer = { id: 'orig_init' };
        store.originalTransactionData = { amount: '100' };

        const snapshot = store.getSnapshot();

        expect(snapshot.originalCustomer).toEqual(store.originalCustomer);
        expect(snapshot.originalInitiatorCustomer).toEqual(store.originalInitiatorCustomer);
        expect(snapshot.originalTransactionData).toEqual(store.originalTransactionData);
    });
});
