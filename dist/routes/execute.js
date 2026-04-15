"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRouter = void 0;
const express_1 = require("express");
const executionLogStore_1 = require("../audit/executionLogStore");
const planStore_1 = require("../planner/planStore");
const taskPlanner_1 = require("../planner/taskPlanner");
const toolEngine_1 = require("../tools/toolEngine");
exports.executeRouter = (0, express_1.Router)();
exports.executeRouter.post('/', async (req, res) => {
    const { planId, confirmRisk } = req.body;
    if (!planId) {
        return res.status(400).json({ error: "planId is required" });
    }
    const plan = (0, planStore_1.getPlan)(planId);
    if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
    }
    // Recalculate risk
    const riskLevel = (0, taskPlanner_1.calculateRisk)(plan);
    if (riskLevel === 'CRITICAL') {
        return res.status(403).json({
            error: "CRITICAL plans require elevated override."
        });
    }
    if (riskLevel === 'HIGH' && !confirmRisk) {
        return res.status(403).json({
            error: "HIGH risk plan requires confirmation.",
            riskLevel
        });
    }
    const results = [];
    for (const call of plan.toolCalls) {
        try {
            const result = await (0, toolEngine_1.executeToolCall)(call.tool, call.input);
            results.push({
                tool: call.tool,
                success: true,
                result
            });
        }
        catch (err) {
            results.push({
                tool: call.tool,
                success: false,
                error: err.message
            });
        }
    }
    const status = results.some(r => !r.success) ? 'FAILED' : 'COMPLETED';
    const executionRecord = (0, executionLogStore_1.saveExecution)({
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
