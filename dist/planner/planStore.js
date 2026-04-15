"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePlan = savePlan;
exports.getPlan = getPlan;
const crypto_1 = require("crypto");
const store = new Map();
function savePlan(plan) {
    const id = (0, crypto_1.randomUUID)();
    store.set(id, plan);
    return id;
}
function getPlan(id) {
    return store.get(id);
}
