const fs = require('fs');

let store = fs.readFileSync('src/stores/creditRequest.js', 'utf8');

// The issue is that saveTransactionData calls createCreditRequest with is_submit=true
// But it's just saving a draft comment. It shouldn't be considered a workflow transition unless it's explicitly transitioning.
// Let's change formData.append("is_submit", "true"); to "false" if we are just saving data.
// Wait, if it's an existing active request (not Draft), backend expects tx_id and allows update if is_submit='true' BUT if existingNotDraft and isSubmittingNewRequest it throws 409.
// isSubmittingNewRequest = is_submit === 'true' && (!req.body.status || req.body.status === 'Opened');
// If we send is_submit='true' without status on a non-draft request, it thinks we are creating a new request and throws 409.
// So we should append a status if we have one, or send is_submit=false if we are just updating data for an active request?
// Actually, if we are in PendingRequests, we shouldn't even call createCreditRequest with is_submit='true' unless we are submitting an action.
// updateStatus already does what we need for workflow actions.
// saveTransactionData is mostly used when drafting, but now we use it for comments.
// If we pass `status` to saveTransactionData, it might fix it.

store = store.replace(
    /        formData\.append\("is_submit", "true"\);/,
    `        formData.append("is_submit", "true");
        if (this.requestStatus) {
            formData.append("status", this.requestStatus);
        }`
);

fs.writeFileSync('src/stores/creditRequest.js', store);
