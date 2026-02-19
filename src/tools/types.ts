import { ZodType } from 'zod';

export const RiskLevels = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
} as const;

export type RiskLevel = typeof RiskLevels[keyof typeof RiskLevels];

export interface Tool<TInput = unknown> {
    name: string;
    risk: RiskLevel;
    schema: ZodType<TInput>;
    execute(input: TInput): Promise<any>;
}
