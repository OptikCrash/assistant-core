import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireWorkspace } from "../middleware/requireWorkspace";
import { WorkspaceService } from "../services/WorkspaceService";
import { detectWorkspaceRuntime } from "../workspace/runtimeDetector";
import {
    getWorkspaceIndex,
    refreshWorkspaceIndex
} from "../workspace/workspaceIndexer";
import {
    getWorkspace,
    listWorkspaces,
    unregisterWorkspace
} from "../workspace/workspaceRegistry";

export const workspaceRouter = Router();
const service = new WorkspaceService();

/**
 * GET /workspace
 */
workspaceRouter.get("/", async (req, res) => {
    try {
        const list = await listWorkspaces();
        res.json(list);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

workspaceRouter.get("/:id", requireWorkspace, async (req, res) => {
    const workspace = await getWorkspace(req.params.id);
    res.json(workspace);
});
/**
 * DELETE /workspace/:id
 */
workspaceRouter.delete("/:id", requireWorkspace, async (req, res) => {
    try {
        await unregisterWorkspace(req.params.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /workspace/:id/status
 */
workspaceRouter.get("/:id/status", requireWorkspace, async (req, res) => {
    try {
        const workspace = await getWorkspace(req.params.id);

        const runtime = detectWorkspaceRuntime(workspace.rootPath);

        res.json(runtime);

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /workspace/:id/runtime/refresh
 */
workspaceRouter.post("/:id/runtime/refresh", requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;

        const workspace = await getWorkspace(id);

        const runtime = detectWorkspaceRuntime(workspace.rootPath);
        // attach runtime (do NOT persist static metadata)
        workspace.runtime = runtime;

        res.json(runtime);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /workspace/:id/runtime
 */
workspaceRouter.get("/:id/runtime", requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;
        const workspace = await getWorkspace(id);

        // Return cached runtime if available, otherwise detect fresh
        const runtime = workspace.runtime ?? detectWorkspaceRuntime(workspace.rootPath);

        res.json(runtime);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /workspace/:id/metadata
 */
workspaceRouter.get("/:id/metadata", requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;
        const workspace = await getWorkspace(id);

        res.json(workspace.metadata);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /workspace/validate
 */
workspaceRouter.post("/validate", async (req, res) => {
    const { rootPath } = req.body;

    if (!rootPath) {
        return res.status(400).json({
            error: "rootPath is required"
        });
    }

    const normalized = path.resolve(rootPath);

    const result = {
        exists: fs.existsSync(normalized),
        isGitRepo: fs.existsSync(path.join(normalized, ".git")),
        hasPackageJson: fs.existsSync(path.join(normalized, "package.json"))
    };

    res.json(result);
});

/**
 * POST /workspace/register
 */
workspaceRouter.post("/register", async (req, res) => {
    const { id, rootPath } = req.body;
    const result = await service.register(id, rootPath);
    res.json(result);
});

/**
 * GET /workspace/:id/index
 */
workspaceRouter.get("/:id/index", requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;

        let index = getWorkspaceIndex(id);

        if (!index) {
            index = await refreshWorkspaceIndex(id);
        }

        res.json(index);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /workspace/:id/index/refresh
 */
workspaceRouter.post("/:id/index/refresh", requireWorkspace, async (req, res) => {
    try {
        const { id } = req.params;
        const depth = req.body?.depth ?? 5;

        const index = await refreshWorkspaceIndex(id, depth);

        res.json(index);
    } catch (err: any) {
        res.status(500).json({
            error: err.message
        });
    }
});