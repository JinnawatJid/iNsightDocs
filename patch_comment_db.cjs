const fs = require('fs');

let workflow = fs.readFileSync('src/components/credit/dashboard/WorkflowActionBar.vue', 'utf8');

workflow = workflow.replace(
    /      const ok = await store\.updateStatus\(action\.targetStatus, text\);\n      if \(ok\) \{/,
    `      const ok = await store.updateStatus(action.targetStatus, text);
      if (ok) {
        if (text) {
          await store.saveCommentToDB(text);
        }`
);

workflow = workflow.replace(
    /      const ok = await store\.updateStatus\(action\.targetStatus, commentText\);\n      if \(ok\) \{/,
    `      const ok = await store.updateStatus(action.targetStatus, commentText);
      if (ok) {
        if (commentText) {
          await store.saveCommentToDB(commentText);
        }`
);

fs.writeFileSync('src/components/credit/dashboard/WorkflowActionBar.vue', workflow);

let store = fs.readFileSync('src/stores/creditRequest.js', 'utf8');

store = store.replace(
    /    async fetchComments\(\) \{/,
    `    async saveCommentToDB(commentText) {
      if (!this.requestId || !commentText) return;
      const authStore = (await import('./auth')).useAuthStore();
      const role = authStore.userRole || 'System';
      try {
        const { default: axios } = await import('axios');
        await axios.post(\`/api/credit-requests/\${this.requestId}/comments\`, {
          comment: commentText,
          actor_role: role
        });
        await this.fetchComments();
      } catch (e) {
        console.error('Failed to save comment to DB:', e);
      }
    },

    async fetchComments() {`
);

fs.writeFileSync('src/stores/creditRequest.js', store);
