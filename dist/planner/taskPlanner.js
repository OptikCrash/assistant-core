"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRisk = calculateRisk;
exports.createPlan = createPlan;
const providerFactory_1 = require("../llm/providerFactory");
const registry_1 = require("../tools/registry");
const planStore_1 = require("./planStore");
const provider = (0, providerFactory_1.createProvider)();
function calculateRisk(plan) {
    const toolMap = new Map(registry_1.TOOL_REGISTRY.map(t => [t.name, t]));
    let highest = 'LOW';
    const ranking = {
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
async function createPlan(request) {
    const plan = await provider.generatePlan(request.message);
    const planId = (0, planStore_1.savePlan)(plan);
    const riskLevel = calculateRisk(plan);
    return {
        planId,
        plan,
        requiresApproval: true,
        riskLevel
    };
}
