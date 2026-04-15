"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const executionLogStore_1 = require("../audit/executionLogStore");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.get('/:executionId', (req, res) => {
    const { executionId } = req.params;
    const record = (0, executionLogStore_1.getExecution)(executionId);
    if (!record) {
        return res.status(404).json({ error: "Execution not found" });
    }
    return res.json(record);
});
