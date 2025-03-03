// verifyRoutes.js
const express = require('express');
const router = express.Router();
const twilio = require('twilio');

// Load environment variables (if not already loaded in your app)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.VERIFY_SERVICE_SID;

// Initialize the Twilio client
const client = twilio(accountSid, authToken);

/**
 *  POST /start-verify
 *
 *  Request Body JSON:
 *  {
 *    "to": "+91XXXXXXXXXX",  // phone number or email
 *    "channel": "sms",       // or "call", "whatsapp", "email"
 *    "locale": "en"          // optional - language code
 *  }
 *
 *  Response JSON:
 *  {
 *    "success": boolean,
 *    "error":   string  (present only if success = false)
 *  }
 */
router.post('/start-verify', async (req, res) => {
  try {
    const { to, channel = 'sms', locale = 'en' } = req.body;

    if (!to || !to.trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing 'to' parameter; please provide a phone number or email.",
      });
    }

    // Send a verification code
    const verification = await client.verify
      .services(verifyServiceSid)
      .verifications.create({
        to,
        channel,  // "sms", "call", "whatsapp", or "email"
        locale,   // e.g., "en", "hi", "zh", "ja", ...
      });

    console.log(`Sent verification: '${verification.sid}' to '${to}'`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error.message);
    // If Twilio returns an error status, we can pass that along; otherwise default to 400
    return res.status(error.status || 400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 *  POST /check-verify
 *
 *  Request Body JSON:
 *  {
 *    "to": "+91XXXXXXXXXX",  // phone number or email
 *    "code": "123456"        // the OTP code entered by user
 *  }
 *
 *  Response JSON:
 *  {
 *    "success": boolean,
 *    "message": string
 *  }
 */
router.post('/check-verify', async (req, res) => {
  try {
    const { to, code } = req.body;

    if (!to || !code) {
      return res.status(400).json({
        success: false,
        message: "Missing 'to' or 'code'.",
      });
    }

    // Check the verification code
    const check = await client.verify
      .services(verifyServiceSid)
      .verificationChecks.create({ to, code });

    if (check.status === 'approved') {
      return res.status(200).json({
        success: true,
        message: 'Verification success.',
      });
    }

    // If not approved, code is incorrect or expired
    return res.status(400).json({
      success: false,
      message: 'Incorrect token.',
    });
  } catch (error) {
    console.error(error.message);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
