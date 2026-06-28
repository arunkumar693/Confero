/**
 * Mock Email Service for Local Prototype Testing
 * Instead of sending real emails, this will log the OTP to the console.
 */

exports.sendOTPEmail = async (toEmail, otp, purpose) => {
  console.log("\n" + "=".repeat(50));
  console.log(`✉️  MOCK EMAIL SENT TO: ${toEmail}`);
  console.log(`📌  PURPOSE: ${purpose.toUpperCase()}`);
  console.log(`🔑  OTP CODE: ${otp}`);
  console.log("=".repeat(50) + "\n");
  
  // Resolve immediately
  return Promise.resolve();
};
