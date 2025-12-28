# System-As-Built Field Inventory

This document provides a comprehensive inventory of all input fields and file uploads currently implemented in the Credit Request creation flow. It is intended to verify system completeness against user requirements.

**Legend:**
- **Visual (*):** A red asterisk is displayed in the UI.
- **Logic Enforced:**
    - **API/Submit:** The "Submit" button block the request if this is missing.
    - **Local:** Input shows a red border/error text if empty (but might not strictly block submit unless noted).

---

## 1. Request Info Tab (`RequestInfoTab.vue`)

**Section: File Attachments**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Credit Application Document** | File Upload | **Yes** | **Yes (Submit)** | `credit_application_doc` |
| Quotation | File Upload | No | No | `quotation` |
| Bank Guarantee | File Upload | No | No | `bank_guarantee_doc` |
| Letter of Guarantee | File Upload | No | No | `letter_guarantee_doc` |

**Section: Contact Information**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Contact Name** | Text | **Yes** | Local | `contact_person` |
| **Position** | Text | **Yes** | Local | `contact_position` |
| Department | Text | No | No | `contact_department` |
| Division | Text | No | No | `contact_division` |
| **Phone** | Number | **Yes** | Local | `contact_phone_number` |

**Section: Credit Request Details**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Credit Limit (Amount)** | Number | **Yes** | Local | `request_amount` |
| Credit Term (Days) | Number | No | No | `request_credit_term` |
| **Credit Reason** | Dropdown | **Yes** | Local | Defaults to 'Stock Goods' |

**Section: Billing Information**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| Billing Requirement | Dropdown | No | No | Default: Not Required |
| Billing Method | Dropdown | No | No | Conditional |
| Billing Schedule | Text | No | No | Conditional |
| Billing Contact Name | Text | No | No | Conditional |
| Billing Department | Text | No | No | Conditional |
| Billing Phone | Text | No | No | Conditional |
| Billing Mobile | Text | No | No | Conditional |
| Billing Email | Text | No | No | Conditional |

**Section: Existing Credit Information**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| Company Name | Text | No | No | Dynamic List |
| Goods | Text | No | No | Dynamic List |
| Term | Text | No | No | Dynamic List |
| Limit | Text | No | No | Dynamic List |

---

## 2. General Info Tab (`GeneralInfoTab.vue`)

**Section: File Attachments**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **ID Card Copy** | File Upload | **Yes** | **Yes (Submit)** | `id_card` |
| **Home Registration Copy** | File Upload | **Yes** | **Yes (Submit)** | `home_reg` |

**Section: Company Information**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Company Name** | Text | **Yes** | Local | `name` |
| Tax ID | Text | No | No | `VAT Registration No_` |

**Section: Authorized Signatories**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Signatory Name 1** | Text | **Yes** | Local | `authorized_person` |
| **Position 1** | Text | **Yes** | Local | `authorized_position` |
| Signatory Name 2 | Text | No | No | `authorized_person_2` |
| Position 2 | Text | No | No | `authorized_position_2` |

**Section: Business Details**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| Business Type | Dropdown | No | No | `business_type` |
| Main Products | Text | No | No | `main_products` |
| Years in Business | Number | No | No | `years_in_business` |

---

## 3. Residence Tab (`ResidenceTab.vue`)

**Section: File Attachments**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Home Photo** | File Upload | **Yes** | **Yes (Submit)** | `home_photo` |
| **Land Tax Document** | File Upload | **Yes** | **Yes (Submit)** | `land_tax` |

**Section: Address Verification**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Address (No/Street)** | Text | **Yes** | Local | `address` |
| **Subdistrict** | Text | **Yes** | Local | `subdistrict` |
| **Post Code** | Number | **Yes** | Local | `zipcode` |
| **District** | Text | **Yes** | Local | `district` |
| **Province** | Text | **Yes** | Local | `province` |
| **Phone** | Number | **Yes** | Local | `phone` |
| Fax | Text | No | No | `fax` |
| Email | Text | No | No | `email` |

**Section: Property Details**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Location Type** | Dropdown | **Yes** | Local | `residence_location_type` |
| **Ownership** | Dropdown | **Yes** | Local | `residence_ownership` |
| Location Other | Text | No | No | Conditional |
| Ownership Value/Rent | Text | No | No | Conditional |

**Section: Map**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| Google Map Code | Text | No | No | `residence_map_code` |
| Landmark | Text | No | No | `residence_landmark` |
| Note | Text | No | No | `residence_note` |

---

## 4. Store / Company Address Tab (`StoreCompanyTab.vue`)

**Section: File Attachments (Conditional)**
*Logic Check: The system enforces distinct sets based on Customer Type.*

**If Company:**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Certificate** | File Upload | **Yes** | **Yes (Submit)** | `legal_entity_certificate` |
| **VAT P.P.20** | File Upload | **Yes** | **Yes (Submit)** | `vat_document` |
| **Company Photo** | File Upload | **Yes** | **Yes (Submit)** | `company_photo` |
| **Land Tax/Lease** | File Upload | **Yes** | **Yes (Submit)** | `company_land_tax` |

**If Individual:**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Commercial Reg.** | File Upload | **Yes** | **Yes (Submit)** | `commercial_reg` |
| **Store Photo** | File Upload | **Yes** | **Yes (Submit)** | `store_photo` |
| **Land Tax/Lease** | File Upload | **Yes** | **Yes (Submit)** | `store_land_tax` |

**Section: Address Verification**
*(Fields match Residence Tab structure)*
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Address** | Text | **Yes** | Local | `address` |
| **Subdistrict** | Text | **Yes** | Local | `subdistrict` |
| **Post Code** | Number | **Yes** | Local | `zipcode` |
| **District** | Text | **Yes** | Local | `district` |
| **Province** | Text | **Yes** | Local | `province` |
| **Phone** | Number | **Yes** | Local | `phone` |
| **Location Type** | Dropdown | **Yes** | Local | `location_type` |
| **Ownership** | Dropdown | **Yes** | Local | `ownership` |

---

## 5. Financial / Statement Tab (`StoreStatementTab.vue`)

**Section: File Attachments**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Bank Statement** | File Upload | **Yes** | **Yes (Submit)** | `bank_statement` |

**Section: Payment Details**
| Field Name | Type | Visual (*) | Logic Enforced | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Payment Method** | Dropdown | **Yes** | Local | `payment_method` |
| Bank Name | Dropdown | No | No | Conditional (if Transfer/Cheque) |
| Branch | Text | No | No | Conditional (if Transfer/Cheque) |
