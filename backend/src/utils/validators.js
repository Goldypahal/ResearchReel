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
  content_type: z.enum(['video', 'document', 'text', 'image']),
  caption: z.string().trim().max(5000).optional(),
  media_urls: z.array(z.string().max(2048)).max(10).optional(),
  document_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  publication_status: z.enum(['preprint', 'published', 'wip']).optional().nullable(),
  doi: z.string().trim().max(255).optional().nullable()
}).refine((p) => (p.caption && p.caption.length > 0) || p.document_id || (p.media_urls && p.media_urls.length), {
  message: 'A post needs text, a paper or media.'
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
