const crypto = require("crypto");
const processIdentifier = crypto.randomBytes(20).toString("hex");

module.exports = processIdentifier;
