import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const domainSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  color: z.string().nullish(),
  sortOrder: z.number().int(),
  archivedAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Domain = z.infer<typeof domainSchema>;

export const createDomainRequestSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  icon: z.string().max(60).optional(),
  color: z.string().max(20).optional(),
});

export type CreateDomainRequest = z.infer<typeof createDomainRequestSchema>;

export const updateDomainRequestSchema = createDomainRequestSchema.partial().extend({
  sortOrder: z.number().int().optional(),
});

export type UpdateDomainRequest = z.infer<typeof updateDomainRequestSchema>;

/** GET /api/domains */
export const listDomainsResponseSchema = z.object({
  domains: z.array(domainSchema),
});

export type ListDomainsResponse = z.infer<typeof listDomainsResponseSchema>;

/** POST /api/domains and PATCH /api/domains/:id */
export const domainResponseSchema = z.object({
  domain: domainSchema,
});

export type DomainResponse = z.infer<typeof domainResponseSchema>;
