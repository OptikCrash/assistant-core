import { ZodType } from 'zod';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Tool<TInput = unknown> {
    name: string;
    risk: RiskLevel;
    schema: ZodType<TInput>;
    execute(input: TInput): Promise<any>;
}
