"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRouter = void 0;
const express_1 = require("express");
const reviewService_1 = require("../features/git/review/reviewService");
exports.reviewRouter = (0, express_1.Router)();
exports.reviewRouter.post('/', async (req, res) => {
    try {
        const result = await (0, reviewService_1.reviewDiff)(true);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
