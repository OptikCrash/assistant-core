import { Router } from "express";
import fs from "fs";
import path from "path";
import { detectWorkspaceRuntime } from "../workspace/runtimeDetector";
import {
    getWorkspace,
    listWorkspaces,
    registerWorkspace,
    unregisterWorkspace
} from "../workspace/workspaceRegistry";

export const workspaceRouter = Router();

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

/**
 * DELETE /workspace/:id
 */
workspaceRouter.delete("/:id", async (req, res) => {
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
workspaceRouter.get("/:id/status", async (req, res) => {
    try {
        const workspace = await getWorkspace(req.params.id);

        const runtime = detectWorkspaceRuntime(workspace.rootPath);

        res.json(runtime);

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

    if (!id || !rootPath) {
        return res.status(400).json({
            error: "id and rootPath are required"
        });
    }

    try {
        const workspace = await registerWorkspace(id, rootPath);
        res.json(workspace);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});