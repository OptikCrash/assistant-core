import { randomUUID } from 'crypto';
import { RiskLevel } from '../tools/types';

export interface ToolExecutionResult {
    tool: string;
    success: boolean;
    result?: any;
    error?: string;
}

export interface ExecutionRecord {
    executionId: string;
    planId: string;
    timestamp: string;
    riskLevel: RiskLevel;
    confirmed: boolean;
    status: 'COMPLETED' | 'FAILED';
    toolResults: ToolExecutionResult[];
}

const executionStore = new Map<string, ExecutionRecord>();

export function saveExecution(record: Omit<ExecutionRecord, 'executionId'>): ExecutionRecord {
    const executionId = randomUUID();

    const fullRecord: ExecutionRecord = {
        executionId,
        ...record
    };

    executionStore.set(executionId, fullRecord);

    return fullRecord;
}

export function getExecution(executionId: string): ExecutionRecord | undefined {
    return executionStore.get(executionId);
}
