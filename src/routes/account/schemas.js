'use strict';

const { z } = require('zod');

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'PASSWORD_CURRENT_AND_NEW').max(128),
  newPassword: z.string().min(8, 'PASSWORD_TOO_SHORT').max(128),
});

const SetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'PASSWORD_TOO_SHORT').max(128),
  confirmPassword: z.string().min(1, 'PASSWORD_MISMATCH').max(128),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'PASSWORD_MISMATCH',
  path: ['confirmPassword'],
});

module.exports = { ChangePasswordSchema, SetPasswordSchema };
