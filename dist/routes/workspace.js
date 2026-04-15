"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const requireWorkspace_1 = require("../middleware/requireWorkspace");
const WorkspaceService_1 = require("../services/WorkspaceService");
const runtimeDetector_1 = require("../workspace/runtimeDetector");
const workspaceIndexer_1 = require("../workspace/workspaceIndexer");
const workspaceRegistry_1 = require("../workspace/workspaceRegistry");
exports.workspaceRouter = (0, express_1.Router)();
const service = new WorkspaceService_1.WorkspaceService();
/**
 * GET /workspace
 * Returns all workspaces with runtime state populated
 */
exports.workspaceRouter.get("/", async (req, res) => {
    try {
        const list = await (0, workspaceRegistry_1.listWorkspaces)();
        // Populate runtime state for each workspace
        const withRuntime = list.map(ws => ({
            ...ws,
            runtime: (0, runtimeDetector_1.detectWorkspaceRuntime)(ws.rootPath)
        }));
        res.json(withRuntime);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.workspaceRouter.get("/:id", requireWorkspace_1.requireWorkspace, async (req, res) => {
    const workspace = await (0, workspaceRegistry_1.getWorkspace)(req.params.id);
    res.json(workspace);
});
/**
 * DELETE /workspace/:id
 */
exports.workspaceRouter.delete("/:id", requireWorkspace_1.requireWorkspace, async (req, res) => {
    try {
        await (0, workspaceRegistry_1.unregisterWorkspace)(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /workspace/:id/status
 */
exports.workspaceRouter.get("/:id/status", requireWorkspace_1.requireWorkspace, async (req, res) => {
    try {
        const workspace = await (0, workspaceRegistry_1.getWorkspace)(req.params.id);
        const runtime = (0, runtimeDetector_1.detectWorkspaceRuntime)(workspace.rootPath);
        res.json(runtime);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /workspace/:id/runtime/refresh
 */
exports.workspaceRouter.post("/:id/runtime/refresh", requireWorkspace_1.requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;
        const workspace = await (0, workspaceRegistry_1.getWorkspace)(id);
        const runtime = (0, runtimeDetector_1.detectWorkspaceRuntime)(workspace.rootPath);
        // attach runtime (do NOT persist static metadata)
        workspace.runtime = runtime;
        res.json(runtime);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /workspace/:id/runtime
 */
exports.workspaceRouter.get("/:id/runtime", requireWorkspace_1.requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;
        const workspace = await (0, workspaceRegistry_1.getWorkspace)(id);
        // Return cached runtime if available, otherwise detect fresh
        const runtime = workspace.runtime ?? (0, runtimeDetector_1.detectWorkspaceRuntime)(workspace.rootPath);
        res.json(runtime);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /workspace/:id/metadata
 */
exports.workspaceRouter.get("/:id/metadata", requireWorkspace_1.requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;
        const workspace = await (0, workspaceRegistry_1.getWorkspace)(id);
        res.json(workspace.metadata);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /workspace/validate
 */
exports.workspaceRouter.post("/validate", async (req, res) => {
    const { rootPath } = req.body;
    if (!rootPath) {
        return res.status(400).json({
            error: "rootPath is required"
        });
    }
    const normalized = path_1.default.resolve(rootPath);
    const result = {
        exists: fs_1.default.existsSync(normalized),
        isGitRepo: fs_1.default.existsSync(path_1.default.join(normalized, ".git")),
        hasPackageJson: fs_1.default.existsSync(path_1.default.join(normalized, "package.json"))
    };
    res.json(result);
});
/**
 * POST /workspace/register
 */
exports.workspaceRouter.post("/register", async (req, res) => {
    const { id, rootPath } = req.body;
    const result = await service.register(id, rootPath);
    res.json(result);
});
/**
 * GET /workspace/:id/index
 */
exports.workspaceRouter.get("/:id/index", requireWorkspace_1.requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;
        let index = (0, workspaceIndexer_1.getWorkspaceIndex)(id);
        if (!index) {
            index = await (0, workspaceIndexer_1.refreshWorkspaceIndex)(id);
        }
        res.json(index);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /workspace/:id/index/refresh
 */
exports.workspaceRouter.post("/:id/index/refresh", requireWorkspace_1.requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;
        const depth = req.body?.depth ?? 5;
        const index = await (0, workspaceIndexer_1.refreshWorkspaceIndex)(id, depth);
        res.json(index);
    }
    catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});
