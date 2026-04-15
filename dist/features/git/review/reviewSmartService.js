"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSmartDiff = reviewSmartDiff;
const providerFactory_1 = require("../../../llm/providerFactory");
const workspaceRegistry_1 = require("../../../workspace/workspaceRegistry");
const ReviewEngine_1 = require("./ReviewEngine");
async function reviewSmartDiff(workspaceId) {
    const workspace = await (0, workspaceRegistry_1.getWorkspace)(workspaceId);
    const engine = new ReviewEngine_1.ReviewEngine((0, providerFactory_1.createProvider)(), workspace.rootPath);
    return engine.run();
}
