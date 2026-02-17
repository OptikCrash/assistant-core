import { Router } from 'express';
import { getPlan } from '../planner/planStore';
import { executeToolCall } from '../tools/toolEngine';

export const executeRouter = Router();

executeRouter.post('/', async (req, res) => {
    const { planId } = req.body;

    if (!planId) {
        return res.status(400).json({ error: "planId is required" });
    }

    const plan = getPlan(planId);

    if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
    }

    const results = [];

    for (const call of plan.toolCalls) {
        try {
            const result = await executeToolCall(call.tool, call.input);

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

    return res.json({
        executed: true,
        results
    });
});
