"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSmartRouter = void 0;
const express_1 = require("express");
const reviewSmartService_1 = require("../features/git/review/reviewSmartService");
exports.reviewSmartRouter = (0, express_1.Router)();
exports.reviewSmartRouter.post("/", async (req, res) => {
    try {
        const { workspaceId } = req.body;
        if (!workspaceId) {
            return res.status(400).json({
                error: "workspaceId is required"
            });
        }
        const result = await (0, reviewSmartService_1.reviewSmartDiff)(workspaceId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});
