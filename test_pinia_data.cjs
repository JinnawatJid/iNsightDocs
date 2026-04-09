const fs = require('fs');
const content = fs.readFileSync('src/stores/creditRequest.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if(l.includes('this.customer = data.customer;')) {
        console.log(`Found assignment at line ${i+1}`);
    }
});
