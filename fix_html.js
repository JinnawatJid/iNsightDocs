const fs = require('fs');
let content = fs.readFileSync('src/components/credit/ReviewDashboard.vue', 'utf8');

// I am looking for the unmatched tags in the DBD grid section.
// The Teleport was placed outside the dbd-snapshot div but looks like I removed the closing div of dbd-snapshot when doing string replace.
content = content.replace(/    <!-- Financial Statement Modal -->/, '    </div>\n\n    <!-- Financial Statement Modal -->');
fs.writeFileSync('src/components/credit/ReviewDashboard.vue', content, 'utf8');
