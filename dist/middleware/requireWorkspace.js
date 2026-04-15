"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireWorkspace = requireWorkspace;
const workspaceRegistry_1 = require("../workspace/workspaceRegistry");
async function requireWorkspace(req, res, next) {
    const id = req.params.id;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
        return res.status(400).json({ error: "Workspace ID is required" });
    }
    try {
        const workspace = await (0, workspaceRegistry_1.getWorkspace)(id);
        return next();
    }
    catch (err) {
        return res.status(404).json({ error: `Workspace not found: ${id}`, message: err.message });
    }
}
