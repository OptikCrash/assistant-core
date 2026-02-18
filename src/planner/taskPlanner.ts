import { createProvider } from '../llm/providerFactory';
import { TOOL_REGISTRY } from '../tools/registry';
import { RiskLevel } from '../tools/types';
import { ChatRequest, TaskPlan } from '../types/messages';
import { savePlan } from './planStore';

const provider = createProvider();

export interface PlanResponse {
    planId: string;
    plan: TaskPlan;
    requiresApproval: boolean;
    riskLevel: RiskLevel;
}

export function calculateRisk(plan: TaskPlan): RiskLevel {
    const toolMap = new Map<string, typeof TOOL_REGISTRY[number]>(
        TOOL_REGISTRY.map(t => [t.name, t])
    );

    let highest: RiskLevel = 'LOW';

    const ranking: Record<RiskLevel, number> = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4
    };

    for (const call of plan.toolCalls) {
        const tool = toolMap.get(call.tool);
        if (tool && ranking[tool.risk] > ranking[highest]) {
            highest = tool.risk;
        }
    }

    return highest;
}

export async function createPlan(
    request: ChatRequest
): Promise<PlanResponse> {

    const plan = await provider.generatePlan(request.message);

    const planId = savePlan(plan);

    const riskLevel = calculateRisk(plan);

    return {
        planId,
        plan,
        requiresApproval: true,
        riskLevel
    };
}
