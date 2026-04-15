import { Router } from 'express';
import { saveExecution } from '../audit/executionLogStore';
import { getPlan } from '../planner/planStore';
import { calculateRisk } from '../planner/taskPlanner';
import { executeToolCall } from '../tools/toolEngine';

export const executeRouter = Router();

function hasRootPath(input: unknown): boolean {
    return !!input && typeof input === "object" && "rootPath" in (input as Record<string, unknown>);
}

executeRouter.post("/", async (req, res) => {
    const { planId, confirmRisk } = req.body;

    if (!planId) {
        return res.status(400).json({ error: "planId is required" });
    }

    const plan = getPlan(planId);
    if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
    }

    // Recalculate risk
    const riskLevel = calculateRisk(plan);

    if (riskLevel === "CRITICAL") {
        return res.status(403).json({
            error: "CRITICAL plans require elevated override.",
            riskLevel
        });
    }

    if (riskLevel === "HIGH" && !confirmRisk) {
        return res.status(403).json({
            error: "HIGH risk plan requires confirmation.",
            riskLevel
        });
    }

    const results: Array<{
        tool: string;
        success: boolean;
        result?: any;
        error?: string;
    }> = [];

    for (const call of plan.toolCalls) {
        // Defense-in-depth: block legacy rootPath from plans
        if (hasRootPath(call.input)) {
            results.push({
                tool: call.tool,
                success: false,
                error: `rootPath is not allowed in tool inputs. Register a workspace and use workspaceId.`
            });
            continue;
        }

        try {
            // Mark these calls as coming from an external/untrusted source (saved plan)
            const result = await executeToolCall(call.tool, call.input, { source: "external" });

            results.push({
                tool: call.tool,
                success: true,
                result
            });
        } catch (err: any) {
            results.push({
                tool: call.tool,
                success: false,
                error: err.message
            });
        }
    }

    const status = results.some((r) => !r.success) ? "FAILED" : "COMPLETED";

    const executionRecord = saveExecution({
        planId,
        timestamp: new Date().toISOString(),
        riskLevel,
        confirmed: !!confirmRisk,
        status,
        toolResults: results
    });

    return res.json({
        executed: true,
        executionId: executionRecord.executionId,
        status,
        riskLevel,
        results
    });
});
