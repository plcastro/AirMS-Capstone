const UserModel = require("../models/userModel");

const desiredLicenseNoIndex = {
  licenseNo: { $type: "string", $gt: "" },
};

const isDesiredLicenseNoIndex = (index) =>
  index?.unique === true &&
  index?.key?.licenseNo === 1 &&
  index?.partialFilterExpression?.licenseNo?.$type === "string" &&
  index?.partialFilterExpression?.licenseNo?.$gt === "";

const ensureUserIndexes = async () => {
  const collection = UserModel.collection;
  const indexes = await collection.indexes();
  const licenseNoIndex = indexes.find((index) => index.name === "licenseNo_1");

  if (isDesiredLicenseNoIndex(licenseNoIndex)) {
    return;
  }

  if (licenseNoIndex) {
    await collection.dropIndex("licenseNo_1");
  }

  await collection.createIndex(
    { licenseNo: 1 },
    {
      unique: true,
      name: "licenseNo_1",
      partialFilterExpression: desiredLicenseNoIndex,
    },
  );
};

module.exports = { ensureUserIndexes };
