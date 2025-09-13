import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().optional(),
  MCP_HTTP_PORT: z.coerce.number().int().positive().optional(),
});

const env = EnvSchema.parse(process.env);
export const config = {
  port: env.PORT ?? env.MCP_HTTP_PORT ?? 8080,
};
