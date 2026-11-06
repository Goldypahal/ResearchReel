const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z.string().min(8, 'Password must be at least 8 characters').max(200, 'Password is too long');

const registerSchema = z.object({
  email,
  username: z.string().trim().toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-z0-9_.]+$/, 'Username may only contain letters, numbers, underscores and dots'),
  password,
  full_name: z.string().trim().min(1, 'Full name is required').max(100, 'Name is too long')
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required')
});

const otpSchema = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code')
});

const emailOnlySchema = z.object({ email });

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset link is invalid'),
  password
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: password
});

const postSchema = z.object({
  content_type: z.enum(['text', 'image', 'document', 'video']).default('text'),
  caption: z.string().trim().max(5000, 'Post is too long (max 5000 characters)').optional().default(''),
  media_urls: z.array(z.string().max(2000)).max(10).optional().default([]),
  document_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().trim().max(50)).max(20).optional().default([]),
  publication_status: z.enum(['preprint', 'published', 'wip']).optional().nullable(),
  doi: z.string().trim().max(255).optional().nullable()
});

const commentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
  parent_id: z.string().uuid().optional().nullable()
});

const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100).optional(),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters').optional().nullable(),
  institution: z.string().trim().max(200).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable()
    .refine((v) => !v || /^https?:\/\//i.test(v), 'Website must start with http:// or https://'),
  research_interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  username: z.string().trim().toLowerCase().min(3).max(30)
    .regex(/^[a-z0-9_.]+$/, 'Username may only contain letters, numbers, underscores and dots').optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  otpSchema,
  emailOnlySchema,
  resetPasswordSchema,
  changePasswordSchema,
  postSchema,
  commentSchema,
  profileUpdateSchema
};
