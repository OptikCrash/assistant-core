import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    OPENAI_API_KEY: z.string().min(1),
    GITHUB_TOKEN: z.string().optional(),
    PORT: z.string().default('1339'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment configuration');
    console.error(z.treeifyError(parsed.error));
    process.exit(1);
}

export const env = parsed.data;