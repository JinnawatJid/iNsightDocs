# Code Review Presentation Guide

## 1. Preparation Checklist
**Goal:** Have everything ready so you don't fumble during the meeting.

- [ ] **VS Code:** Open the project root.
- [ ] **Terminal:** Split your terminal.
  - Terminal 1: `npm run dev` (Frontend)
  - Terminal 2: `npm start` (Backend)
- [ ] **Browser:** Open `http://localhost:5173`.
- [ ] **Tabs to Open in VS Code (in order):**
  1.  `src/views/CreateCreditRequest.vue`
  2.  `src/components/credit/CreditRequestHeader.vue`
  3.  `src/services/CustomerService.js`
  4.  `backend/routes/customerRoutes.js`
  5.  `backend/controllers/customerController.js`
  6.  `src/stores/creditRequest.js`

---

## 2. The Presentation Script (30 Minutes)

### Phase 1: The Intro (2 Minutes)
*   **Say:** "Today I'd like to walk you through the **Credit Request Creation** flow. This is the core entry point of the system where we identify a customer and aggregate their financial data from our backend."
*   **Show:** The main empty screen (`CreateCreditRequest.vue`).

### Phase 2: The User Action (5 Minutes)
*   **Action:** Type "100" into the search bar.
*   **Show:** The dropdown suggestions appearing.
*   **Say:** "First, we implemented a real-time suggestion system. As the user types, we fetch matches."
*   **Code Switch:** Go to `CreditRequestHeader.vue`.
    *   Point to `debouncedFetchSuggestions` (Line ~55).
    *   **Explain:** "We use `lodash/debounce` here to wait 300ms before firing the API call. This prevents spamming our server with every keystroke."

### Phase 3: The Request - Frontend (5 Minutes)
*   **Action:** Select a customer from the dropdown.
*   **Say:** "When I select a customer, the system initiates a full data fetch."
*   **Code Switch:** Go to `src/services/CustomerService.js`.
    *   **Explain:** "We use **Axios** as our HTTP client. It acts as the bridge between our Vue frontend and the Express backend."
    *   *Highlight:* `searchCustomers(query)` function.
    *   **Detail:** "It sends a GET request to `/api/customers/search`. We use a proxy in Vite to forward this to our backend port (3000)."

### Phase 4: The Processing - Backend (8 Minutes)
*   **Code Switch:** Go to `backend/controllers/customerController.js`.
*   **Say:** "On the server side, we don't just return raw data. We perform business logic aggregation here."
*   **Step 1: Basic Info:** Show the first SQL query (Line ~44) on the `Customers` table.
*   **Step 2: Financial Logic:** Scroll down to the `AY_ACCUM` query (Line ~95).
    *   **Crucial:** Explain the `avgRaw` calculation (Line ~105): `(Jun + Jul + Aug) / 2`.
    *   **Say:** "This implements the specific business rule required by the credit department. We calculate the monthly average and format the trend data (Line ~20 `formatTrend`) before sending it to the frontend."

### Phase 5: State Management - Pinia (5 Minutes)
*   **Code Switch:** Go to `src/stores/creditRequest.js`.
*   **Say:** "Once the data returns, we need to share it across multiple components (the header, the form, the history sidebar). We use **Pinia** for this."
*   **Highlight:** `state` (Line 6) and `searchCustomer` action (Line 44).
*   **Explain:** "The `searchCustomer` action commits the data to our state variables (`customer`, `financialSummary`). Because this state is reactive, all components listening to it update automatically."

### Phase 6: The Result (5 Minutes)
*   **Back to Browser:** Show the populated screen.
    *   Point to the **Address Form**: "Auto-filled from `state.customer`."
    *   Point to the **Credit Score Summary** (right column): "Calculated from `state.financialSummary`."
*   **Conclusion:** "This architecture ensures that complex business logic stays on the server, while the frontend remains responsive and focused on presentation."

---

## 3. Deep Dive Cheat Sheet (For Your "Specific Concerns")

### Topic A: How Pinia Works (State Management)
Think of Pinia as a **Global Variable box** that is "Reactive" (Smart).

1.  **The Store (`useCreditRequestStore`):** This is the box. You define it once, and import it anywhere.
2.  **State (`state`):** These are the variables inside the box (e.g., `customer`, `hasSearched`).
    *   *In Code:* `state: () => ({ customer: {} })`
3.  **Actions (`actions`):** These are functions that modify the variables.
    *   *In Code:* `searchCustomer(query)` fetches data and then says `this.customer = results`.
4.  **Reactivity:** In `CreateCreditRequest.vue`, we have `<div v-if="store.hasSearched">`.
    *   *Magic:* Vue "watches" the store. When you change `hasSearched` to `true` inside the Action, Vue immediately re-renders the HTML to show the new content. You don't need to manually tell the screen to update.

### Topic B: How Axios Works (Data Fetching)
Axios is a library that makes sending HTTP requests (like a browser does when you type a URL) easy in JavaScript code.

1.  **The Promise:** Axios returns a "Promise". This means "I will have the data for you in the future, but not right now."
    *   *That's why we use `await`:* `const response = await axios.get(...)`. It tells JavaScript to "pause" that specific function until the server replies.
2.  **The Request:**
    *   Frontend says: "Hey Axios, GET info for customer '100'."
    *   Axios: Sends a network packet to `localhost:3000/api/customers/search?q=100`.
3.  **The Response:**
    *   Backend replies with JSON: `{ "name": "John", ... }`.
    *   Axios wraps this in a response object: `response.data` holds the actual JSON.
4.  **Error Handling:**
    *   We wrap Axios calls in `try...catch`. If the server is down (404/500), Axios "throws" an error, and our `catch` block runs (showing the SweetAlert popup).

---

## 4. Anticipated Questions & Answers

**Q: Why do you calculate the Financial Average on the backend instead of the frontend?**
**A:** "To keep the business logic centralized. If we ever change the formula (e.g., divide by 3 instead of 2), we only change it in one place (the controller), and all frontend clients (web, mobile, etc.) get the correct logic immediately."

**Q: Why use Pinia instead of just passing props?**
**A:** "The data (customer info) is needed in three very different places: the Header (top), the Form (center), and the History (left). Passing props down that many layers ('prop drilling') would make the code messy and hard to maintain. Pinia lets any component access the data directly."

**Q: How do you handle sql injection?**
**A:** "We use parameterized queries (the `?` placeholders) in our SQL statements. The SQLite library automatically escapes the inputs, so even if a user searches for `DROP TABLE`, it's treated as a text string, not a command."
