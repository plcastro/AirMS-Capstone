const { randomInt } = require("crypto");

const generateOTP = () => {
  return randomInt(100000, 999999).toString();
};

module.exports = generateOTP;
