const { createApp } = require('vue');
const App = {
  template: `
    <div>
      <p>Initiator: {{ isInitiator }}</p>
      <p>canUpload: {{ canUpload }}</p>
    </div>
  `,
  data() {
    return {
      isInitiator: true,
      requestStatus: 'Draft'
    }
  },
  computed: {
    canUpload() {
      if (this.requestStatus === 'Draft') return false;
      return true;
    }
  }
}
// Note: Running vue in node like this is tricky, I'll just analyze the code.
