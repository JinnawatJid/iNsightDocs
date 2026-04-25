# Customer Search Process

This document explains the end-to-end customer search process in the Credit Request application, detailing how the system receives the user's search key, processes it through multiple services, and maps the resulting data back into the frontend form.

## End-to-End System Flow (Macro View)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Frontend Form
    participant Store as Pinia Store (creditRequest)
    participant CS as CustomerService
    participant API as External System API
    participant DB as Local Database

    User->>UI: Type Search Query

    alt Real-time Suggestions (Query Length >= 3)
        UI->>CS: getSuggestions(query)
        CS-->>UI: Return Quick Suggestions Dropdown
    end

    User->>UI: Click "Search" button or Press Enter
    UI->>Store: searchCustomer(query)
    Store->>UI: Show Loading Indicator (Swal)
    Store->>CS: searchCustomers(query, fetchBy='vat')
    CS->>Backend Router: GET /api/customers/search?q=query

    participant Controller as Backend CustomerController
    Backend Router->>Controller: searchCustomers(query)

    alt External API Search (Master)
        Controller->>API: Execute Parallel Search Requests (By ID, Name, Mobile, VAT)
        API-->>Controller: Return Raw Customer Data Array
    else External API Fails (Fallback)
        Controller->>DB: searchCustomersFallback(query)
        DB-->>Controller: Return Local Customer Records
    end

    Controller->>Controller: Deduplicate Results

    loop For Each Unique Customer
        Controller->>DB: fetch Local History & Current Credit Limit
        Controller->>DB: fetch Local Billing/Payment Details
        Controller->>Controller: enrichCustomerData()
        Controller->>DB: checkBlacklist(taxId, names)
        Controller->>Controller: Map raw properties to standard 'Customer' object
    end

    Controller-->>CS: Return Enriched Customer Array
    CS-->>Store: Return Customer Results

    Store->>Store: Clear Existing Form Data

    %% New SCV Step
    Store->>CS: checkCreditByVat(taxId)
    CS->>API: Query all accounts with this VAT
    API-->>Store: Returns existing accounts with credit

    alt Existing Credit Found on Different Account
        Store->>UI: Show Warning (Redirect to Primary Account)
        UI-->>User: "พบข้อมูลเครดิตเดิม"
        Store->>Store: searchCustomer(PrimaryAccountNo)
    else No Existing Credit
        Store->>Store: Transform Result to Form Structure
        Store->>Store: Map Payment Terms, Contact Details, Store Locations
        Store->>Store: Save to Pinia Transaction Data
        Store->>UI: Hydrate General Info Form & Close Loading
        UI-->>User: Customer Details Displayed in Form Fields
    end
```

---

## Step-by-Step Explanation (Micro Views)

### 1. You type in the search box (Frontend)
When you type in the search field, the system is listening to your input. If what you've typed is at least 3 characters long, the frontend sends a quick request in the background to get "suggestions" and shows them to you in a dropdown.

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend Form (GeneralInfoTab)
    participant CS as CustomerService

    User->>UI: Type characters (e.g. "บริ")
    UI->>UI: Check query length (>= 3)
    UI->>CS: debouncedFetchSuggestions()
    CS-->>UI: Return Quick Suggestions Array
    UI-->>User: Display Dropdown
```

**Relevant File:** `src/components/credit/tabs/GeneralInfoTab.vue`
```javascript
function onInput() {
    if (searchQuery.value.length >= 3) {
        debouncedFetchSuggestions();
    } else {
        showDropdown.value = false;
        suggestions.value = [];
    }
}
```

### 2. The Frontend requests full data
Once you trigger the full search (by clicking a suggestion, clicking the search button, or pressing Enter), the frontend shows a "Loading" popup so you know it's working. It then sends your search text to the backend API.

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend Form
    participant Store as Pinia Store (creditRequest.js)
    participant API as Backend Route

    User->>UI: Click "Search" button
    UI->>Store: Trigger searchCustomer(query)
    Store->>UI: Swal.fire() Show Loading Spinner
    Store->>API: GET /api/customers/search?q=query
```

**Relevant File:** `src/stores/creditRequest.js`
```javascript
async searchCustomer(query) {
    if (!query) return;
    this.loading = true;

    // Show loading popup
    Swal.fire({
        title: "กำลังค้นหาข้อมูลลูกค้า",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
    });

    // Call backend API
    const results = await CustomerService.searchCustomers(query);
    // ...
}
```

### 3. The Backend connects to the External API (Navision/ERP)
The backend doesn't just search the local database; it goes to the main external ERP system to get the most up-to-date data. It performs **4 parallel searches at the same time** using your text. It searches by ID, Name, Mobile Phone Number, and VAT Registration Number. This ensures that no matter what you typed, if there's a match, the system will find it quickly.

```mermaid
sequenceDiagram
    participant Ctrl as customerController
    participant Ext as External ERP API

    Ctrl->>Ext: Search by Customer ID (Timeout: 5s)
    Ctrl->>Ext: Search by Customer Name (Timeout: 5s)
    Ctrl->>Ext: Search by Mobile Phone (Timeout: 5s)
    Ctrl->>Ext: Search by VAT Registration No (Timeout: 5s)

    Note over Ctrl, Ext: Requests run concurrently via Promise.allSettled

    Ext-->>Ctrl: Array of Results (Merged)
```

**Relevant File:** `backend/controllers/customerController.js`
```javascript
const searchApiCustomers = async (query) => {
    // Define fields for Split & Merge
    const searchRequests = [
        { label: "By ID",   payload: { "No_": { "$like": `%${query}%` } } },
        { label: "By Name", payload: { "Name": { "$like": `%${query}%` } } },
        { label: "By Mobile", payload: { "Mobile Phone No_": { "$like": `%${query}%` } } },
        { label: "By VAT", payload: { "VAT Registration No_": { "$like": `%${query}%` } } }
    ];

    // Execute all 4 searches in parallel
    const promises = searchRequests.map(reqData =>
         axios.post(API_URL, { page: 1, size: 10, ...reqData.payload }, {
          headers: { "apikey": API_KEY },
          timeout: 5000 // 5s timeout
        }).then(response => response.data.data || [])
    );
    // ...
};
```

### 4. Fallback if the External API is down
If the external API is completely down or doesn't respond in time (it has a 5-second timeout), the backend won't just fail. Instead, it automatically falls back to searching the local SQL Database to see if it has the customer saved from a previous request.

```mermaid
sequenceDiagram
    participant Ctrl as customerController
    participant DB as Local Database

    Note over Ctrl: Check results of parallel requests

    alt All External Requests Rejected/Failed
        Ctrl->>DB: searchCustomersFallback(query)
        Note over DB: Run SQL LIKE query on saved Customers
        DB-->>Ctrl: Local Customer Records Array
    end
```

**Relevant File:** `backend/controllers/customerController.js`
```javascript
    // Check if all external API requests failed
    const allFailed = resultsArrays.every(r => r.status === 'rejected');
    if (allFailed) {
        // ... log error
        // If external API fails, use local DB search fallback
        return await searchCustomersFallback(req, res, query);
    }
```

### 5. Data Processing & Enrichment (Backend)
Because it searched 4 ways, it might get duplicate records. The backend cleans this up so there is only one record per customer. Then, the backend **"enriches"** the data by looking up extra local information that the external API might not have, such as their current Credit Limit, history of Credit Requests, and specific billing conditions. It also runs a **Blacklist Check** on their Tax ID. Finally, it formats all this data and sends it back to the frontend.

```mermaid
sequenceDiagram
    participant Ctrl as customerController
    participant DB as Local Database

    Ctrl->>Ctrl: Deduplicate records by 'No_'

    loop For Each Unique Customer
        Ctrl->>DB: enrichCustomerData(customerNo)
        Note over DB: Fetch Credit History, Credit Limit, Billing Info
        DB-->>Ctrl: History & Financial Summary

        Ctrl->>DB: checkBlacklist(taxId, names)
        DB-->>Ctrl: Blacklist Status

        Ctrl->>Ctrl: Map raw fields into standard format
    end

    Ctrl-->>Frontend: Send Array of mapped customer objects
```

**Relevant File:** `backend/controllers/customerController.js`
```javascript
exports.searchCustomers = async (req, res) => {
    // ...
    // Map & Enrich
    const mappedResults = await Promise.all(uniqueCustomers.map(async (row) => {
        const currentCreditLimit = parseFloat(row["Fixed Credit Limit"]) || 0;

        // Fetch Local History & Financials
        const enriched = await enrichCustomerData(row["No_"], currentCreditLimit, row["VAT Registration No_"], fetchPurchaseBy);

        // Blacklist Check
        const blacklistInfo = await checkBlacklist({
            taxId: row["VAT Registration No_"],
            personNames: [row["Contact"], row["Name"]],
            companyNames: [row["Name"]]
        });

        // Return structured format to frontend
        return { customer: { id: row["No_"], name: row["Name"], ... }, ...enriched };
    }));
    // ...
};
```

### 6. Single Customer View (VAT Verification)
Once the frontend receives the data, it performs a crucial check to prevent duplicate credit accounts. It takes the customer's VAT Registration Number and asks the backend if *any other account* (e.g., a different branch) already has an approved credit limit. If it finds one, it warns the user and automatically redirects the search to that primary account.

```mermaid
sequenceDiagram
    participant Store as Pinia Store
    participant API as External ERP API
    participant UI as Frontend Form

    Store->>API: checkCreditByVat(taxId)
    API-->>Store: Returns existing accounts with > 0 limit

    alt Different account with same VAT has Credit
        Store->>UI: Show Warning (Swal.fire)
        UI-->>User: "พบข้อมูลเครดิตเดิม"
        Store->>Store: Restart searchCustomer(Primary Account ID)
    end
```

**Relevant File:** `src/stores/creditRequest.js`
```javascript
    const creditCheck = await CustomerService.checkCreditByVat(vatToCheck);
    if (creditCheck && creditCheck.hasCredit) {
        const account = creditCheck.accountWithCredit;

        // If the account with credit is not the one currently being searched
        if (account && account.No_ !== this.customer.id) {
            Swal.close(); // close loading

            await Swal.fire({
                icon: "warning",
                title: "พบข้อมูลเครดิตเดิม",
                html: `ลูกค้าท่านนี้มีวงเงินอนุมัติอยู่แล้วภายใต้รหัส <b>${account.No_}</b><br/>ระบบจะทำการเปลี่ยนไปยังรหัสดังกล่าว เพื่อให้การขอเครดิตเชื่อมโยงกับบัญชีหลัก`,
                confirmButtonText: "ตกลง"
            });

            // Trigger search for the correct account
            return this.searchCustomer(account.No_);
        }
    }
```

### 7. Mapping the data to the Form (Frontend)
If the VAT check passes, the frontend proceeds to map the data. It looks at the customer's name. If it contains words like "บริษัท" (Company) or "หจก." (Limited Partnership), it knows this is a corporate profile. Depending on whether it's a corporate or individual profile, it automatically maps the address, phone number, and other details into the correct input boxes in the "General Info" tab. The loading popup disappears, and the form is ready to use!

```mermaid
sequenceDiagram
    participant Store as Pinia Store
    participant UI as Frontend Form
    actor User

    Store->>Store: Analyze Name keywords (e.g. "บริษัท")
    alt isCompany == false
        Store->>Store: Map address to store_address
    else isCompany == true
        Store->>Store: Use standard mapping logic
    end

    Store->>Store: Populate transactionData (e.g. Credit Amount)
    Store->>UI: Close Loading Spinner (Swal.close())
    UI-->>User: Form populated with data
```

**Relevant File:** `src/stores/creditRequest.js`
```javascript
    // Check if Company or Individual
    const name = data.customer.name || "";
    const keywords = ["บริษัท", "ห้างหุ้นส่วนจำกัด", "บ.", "หจก."];
    const isCompany = keywords.some((keyword) => name.includes(keyword));

    // Map data differently based on customer type
    if (!isCompany) {
        data.customer.store_address = data.customer.address;
        data.customer.address = ""; // Clear main address to force store mapping
        // ... map other fields
    }

    this.customer = data.customer;
    // Map remaining fields to transaction data for the form inputs
    this.transactionData.amount = String(this.customer.current_credit_limit || 0);
    // ...
```
