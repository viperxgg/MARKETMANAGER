import { z } from "zod";
import { publish } from "./client";
import type { IntegrationCommand } from "../types";

export const publishPostSchema = z.object({
  message: z.string().min(5).max(8000),
  imageUrl: z.string().url().optional().nullable()
});

export const publishPost: IntegrationCommand<
  z.infer<typeof publishPostSchema>,
  { postId?: string }
> = {
  id: "publish_post",
  description: "Publish a Facebook page post (feed or photo). Requires owner approval.",
  schema: publishPostSchema,
  requiresApproval: true,
  async execute(input) {
    const result = await publish({ message: input.message, imageUrl: input.imageUrl ?? null });
    return {
      success: result.success,
      data: { postId: result.postId },
      error: result.error,
      externalId: result.postId
    };
  }
};
