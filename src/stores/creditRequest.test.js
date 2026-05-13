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
});

    it('should immutably preserve original fields when backend returns edited snapshot', async () => {
        const store = useCreditRequestStore();

        // Mock a response representing the initial load (Draft or Opened)
        // Initiator sets amount to 500
        const initialLoadData = {
            data: {
                data: {
                    txId: 'TX-123',
                    status: 'Opened',
                    request_amount: '500',
                    term_gs: '7', term_ae: '7', term_yc: '7',
                    original_snapshot: {
                        originalRequestedAmount: '500',
                        originalRequestedTerms: { termGS: '7', termAE: '7', termYC: '7' },
                        originalTransactionData: { amount: '500', termGS: '7', termAE: '7', termYC: '7' },
                        transaction_data: { amount: '500', termGS: '7', termAE: '7', termYC: '7' }
                    },
                    snapshot_data: {
                        transaction_data: { amount: '500', termGS: '7', termAE: '7', termYC: '7' }
                    }
                }
            }
        };

        // We will directly mock the getCreditRequestDetail response via spying since vi.mock is hoisted
        const CreditRequestService = (await import('@/services/CreditRequestService')).default;

        vi.spyOn(CreditRequestService, 'getCreditRequestDetail').mockResolvedValue(initialLoadData);

        await store.loadRequestDetail('TX-123');

        expect(store.originalRequestedAmount).toBe('500');
        expect(store.originalTransactionData.amount).toBe('500');
        expect(store.transactionData.amount).toBe('500');

        // Now simulate a reviewer saving an edit (amount -> 1000)
        // createCreditRequest response includes the updated transactionData
        // but it SHOULD NOT overwrite originalTransactionData

        const editedSaveResponse = {
            data: {
                data: {
                    txId: 'TX-123',
                    status: 'Opened',
                    request_amount: '1000',
                    term_gs: '7', term_ae: '7', term_yc: '7',
                    original_snapshot: {
                        originalRequestedAmount: '500',
                        originalRequestedTerms: { termGS: '7', termAE: '7', termYC: '7' },
                        originalTransactionData: { amount: '500', termGS: '7', termAE: '7', termYC: '7' },
                        transaction_data: { amount: '500', termGS: '7', termAE: '7', termYC: '7' }
                    },
                    snapshot_data: {
                        transaction_data: { amount: '1000', termGS: '7', termAE: '7', termYC: '7' }
                    }
                }
            }
        };

        vi.spyOn(CreditRequestService, 'createCreditRequest').mockResolvedValue(editedSaveResponse);

        // This simulates what happens when the user hits 'save'
        // We bypass actual HTTP and directly push the mock response in the store's action
        store.transactionData.amount = '1000';
        await store.createCreditRequest('123', 'Customer Name');

        // The live editable state should reflect the edit
        expect(store.transactionData.amount).toBe('1000');

        // The original baseline MUST remain 500
        expect(store.originalRequestedAmount).toBe('500');
        expect(store.originalTransactionData.amount).toBe('500');
    });
