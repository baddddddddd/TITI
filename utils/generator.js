const crypto = require('crypto');

function generateRandomCode(length) {
    const randomBytes = crypto.randomBytes(Math.ceil(length / 2));
    return randomBytes.toString('hex').slice(0, length);
}

function generateClassCode() {
    return generateRandomCode(6);
}

module.exports = generateClassCode;