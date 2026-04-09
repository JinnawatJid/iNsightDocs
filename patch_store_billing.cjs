const fs = require('fs');

let content = fs.readFileSync('src/stores/creditRequest.js', 'utf8');

// Looking for the place where we set this.customer = data.customer;
// Around line 407
content = content.replace(
    '          this.customer = data.customer;',
    '          this.customer = data.customer;\n          if (this.customer["Billing Terms Code"]) {\n            this.customer.billing_terms_code = this.customer["Billing Terms Code"];\n          }'
);

fs.writeFileSync('src/stores/creditRequest.js', content);
