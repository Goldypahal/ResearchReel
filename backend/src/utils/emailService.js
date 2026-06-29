const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Or use SMTP settings from .env
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"ResearchReel Verification" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your ResearchReel Verification Code',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #4f46e5; text-align: center;">ResearchReel</h2>
        <p>Hi there,</p>
        <p>Thank you for being part of the future of academic discourse. Use the code below to verify your account:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; border-radius: 8px;">
          ${otp}
        </div>
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="text-align: center; color: #9ca3af; font-size: 12px;">Premium Research Platform • verified by ResearchReel</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
