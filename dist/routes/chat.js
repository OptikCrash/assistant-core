"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const taskPlanner_1 = require("../planner/taskPlanner");
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.post('/', async (req, res) => {
    const body = req.body;
    const result = await (0, taskPlanner_1.createPlan)(body);
    res.json(result);
});
