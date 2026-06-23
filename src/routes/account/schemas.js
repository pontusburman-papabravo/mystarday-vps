'use strict';

const { z } = require('zod');

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Nuvarande lösenord krävs').max(128),
  newPassword: z.string().min(8, 'Nytt lösenord måste vara minst 8 tecken').max(128),
});

const SetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Lösenordet måste vara minst 8 tecken').max(128),
  confirmPassword: z.string().min(1, 'Bekräfta lösenord krävs').max(128),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Lösenorden matchar inte',
  path: ['confirmPassword'],
});

module.exports = { ChangePasswordSchema, SetPasswordSchema };
