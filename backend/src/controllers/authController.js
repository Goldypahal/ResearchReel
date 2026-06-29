const authService = require('../services/authService');
const db = require('../config/db');

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && emailRegex.test(email);
};

// Register User
exports.register = async (req, res) => {
  try {
    const { email, username, password, full_name } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (!full_name || full_name.trim().length < 1) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    await authService.register({ email, username, password, full_name });
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      email,
      requiresVerification: true
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || 'Server Error' });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!otp || otp.trim().length !== 6) {
      return res.status(400).json({ success: false, message: 'Verification OTP must be exactly 6 digits.' });
    }

    const { user, accessToken, refreshToken } = await authService.verifyOTP({ email, otp });

    // Set HttpOnly, SameSite cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Verification failed' });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    const { user, accessToken, refreshToken } = await authService.login({ email, password });

    // Set HttpOnly, SameSite cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Invalid credentials' });
  }
};

// Logout User
exports.logout = async (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ORCID Callback Placeholder
exports.orcidCallback = async (req, res) => {
  const { orcid_id, user_id } = req.body;
  if (!orcid_id) {
    return res.status(400).json({ success: false, message: 'ORCID ID is required.' });
  }
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }
  try {
    await db.query('UPDATE users SET orcid_id = $1, verification_status = $2 WHERE id = $3', [orcid_id, 'scholar', user_id]);
    res.status(200).json({ success: true, message: 'Verified as Scholar' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ORCID verification failed' });
  }
};

// Student ID Verification Flow (Section 5.2)
exports.studentVerification = async (req, res) => {
  const { user_id, university } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }
  if (!university) {
    return res.status(400).json({ success: false, message: 'University name is required.' });
  }
  try {
    await db.query('UPDATE users SET verification_status = $1 WHERE id = $2', ['student', user_id]);
    res.status(200).json({ success: true, message: 'Student ID Submitted for Faculty Approval' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Verification process failed' });
  }
};
