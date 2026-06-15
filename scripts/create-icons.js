const fs = require('fs');
const path = require('path');
const img = fs.readFileSync(path.join(__dirname, '..', 'public', 'logo-el-patron.jpeg'));
fs.writeFileSync(path.join(__dirname, '..', 'public', 'logo-el-patron-192.png'), img);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'logo-el-patron-512.png'), img);
console.log('Icons created successfully');
