const fs = require('fs');
const file = 'backend/config/credit_scorecard_v1.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.size_definitions = ["S", "M", "L"];
data.grade_definitions = ["D", "C", "B", "B+", "A", "A+"];
fs.writeFileSync(file, JSON.stringify(data, null, 2));

const file2 = 'backend/config/credit_scorecard_existing_v1.json';
const data2 = JSON.parse(fs.readFileSync(file2, 'utf8'));
data2.size_definitions = ["S", "M", "L"];
data2.grade_definitions = ["D", "C", "B", "B+", "A", "A+"];
fs.writeFileSync(file2, JSON.stringify(data2, null, 2));
console.log('done patching configs');
