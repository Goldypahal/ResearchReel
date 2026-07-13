const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const otpSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be exactly 6 characters')
});

const postSchema = z.object({
  content_type: z.enum(['video', 'document', 'text']),
  caption: z.string().optional(),
  media_url: z.string().url().optional().or(z.literal('')),
  doi: z.string().optional()
});

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty')
});

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'pptx', 'xlsx', 'mp4', 'jpg', 'jpeg', 'png'];

const documentSchema = z.object({
  file_name: z.string().min(1).refine((val) => {
    const ext = val.split('.').pop().toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  }, { message: 'Invalid file extension. Only PDF, DOCX, PPTX, XLSX, MP4, JPG, PNG allowed.' }),
  file_type: z.string().min(1).refine((val) => {
    return ALLOWED_EXTENSIONS.includes(val.toLowerCase());
  }, { message: 'Invalid file type.' }),
  file_url: z.string().url('Invalid file URL')
});

module.exports = {
  registerSchema,
  loginSchema,
  otpSchema,
  postSchema,
  commentSchema,
  documentSchema
};
