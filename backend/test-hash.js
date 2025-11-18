const bcrypt = require('bcryptjs');

const password = '123456';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);

// Test verify
const isMatch = bcrypt.compareSync(password, hash);
console.log('Verify:', isMatch);

