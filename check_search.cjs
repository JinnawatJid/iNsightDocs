const axios = require('axios');
async function check() {
    try {
        const res = await axios.get('http://localhost:3000/api/customers/search?q=01017AY');
        console.log('Search Result:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}
check();
