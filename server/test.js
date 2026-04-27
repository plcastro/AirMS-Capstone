require("dotenv").config();

const sendEmail = require("./utils/sendEmail");

console.log("ENV:", process.env.EMAIL_HOST, process.env.EMAIL_PORT);

sendEmail("kikoabraham22@gmail.com", "Test Email", "This is a test")
  .then(() => console.log("Email sent!"))
  .catch((err) => console.error("Email failed:", err));

console.log("Host:", process.env.EMAIL_HOST);
console.log("Port:", process.env.EMAIL_PORT);
