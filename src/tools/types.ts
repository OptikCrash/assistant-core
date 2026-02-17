export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Tool {
    name: string;
    risk: RiskLevel;
    execute(input: Record<string, any>): Promise<any>;
}
