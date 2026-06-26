import { z } from 'zod';
export const verticalSchema = z.enum(['combat', 'pro_wrestling']);
export const swarmModeSchema = z.enum(['DRY_RUN', 'SHADOW', 'DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOMATED']);
export const requestedBySchema = z.object({
    id: z.string().optional(),
    email: z.string().email().optional(),
    role: z.string().optional(),
    source: z.enum(['admin', 'system', 'scheduler', 'backend', 'developer']).default('backend'),
}).passthrough();
export const sourceEntitySchema = z.object({
    type: z.string().min(1),
    id: z.string().optional(),
    label: z.string().optional(),
    url: z.string().url().optional(),
}).passthrough().optional();
export const wrestlingStatsSchema = z.object({
    HP: z.coerce.number().int().min(0).default(0),
    BP: z.coerce.number().int().min(0).default(0),
    K: z.coerce.number().int().min(0).default(0),
    PM: z.coerce.number().int().min(0).default(0),
    FM: z.coerce.number().int().min(0).default(0),
});
export const websiteBlogSectionSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    image: z.string().optional(),
    imagePublicId: z.string().optional(),
    headings: z.array(z.object({
        title: z.string().min(1),
        content: z.string().min(1),
    })).default([]),
});
export const websiteBlogDraftSchema = z.object({
    metaTitle: z.string().min(1),
    metaDescription: z.string().min(1),
    header: z.string().min(1),
    slug: z.string().optional(),
    blogHeaderImage: z.string().optional(),
    sections: z.array(websiteBlogSectionSchema).min(1),
    tags: z.array(z.string()).default([]),
    vertical: verticalSchema,
});
