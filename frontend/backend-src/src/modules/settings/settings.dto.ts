import { z } from 'zod';

export const updateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
      category: z.string().optional(),
    }),
  ),
});

export const paymentMethodsSchema = z.object({
  methods: z
    .array(
      z.object({
        value: z
          .string()
          .min(1, 'Method code is required')
          .max(50)
          .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers or underscore'),
        label: z.string().min(1, 'Method label is required').max(100),
        enabled: z.boolean().default(true),
      }),
    )
    .min(1, 'At least one payment method is required'),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type PaymentMethodsInput = z.infer<typeof paymentMethodsSchema>;
