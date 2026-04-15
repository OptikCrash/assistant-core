"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveExecution = saveExecution;
exports.getExecution = getExecution;
const crypto_1 = require("crypto");
const executionStore = new Map();
function saveExecution(record) {
    const executionId = (0, crypto_1.randomUUID)();
    const fullRecord = {
        executionId,
        ...record
    };
    executionStore.set(executionId, fullRecord);
    return fullRecord;
}
function getExecution(executionId) {
    return executionStore.get(executionId);
}
