const UserModel = require("../models/userModel");

const generateUniqueUsername = async (firstName, lastName) => {
  const baseUsername = `${lastName}${firstName[0]}`
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

  let username = baseUsername;
  let suffix = 1;

  while (await UserModel.exists({ username })) {
    suffix += 1;
    username = `${baseUsername}${suffix}`;
  }

  return username;
};

module.exports = generateUniqueUsername;
