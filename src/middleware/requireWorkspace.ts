import { NextFunction, Request, Response } from "express";
import { getWorkspace } from "../workspace/workspaceRegistry";

declare global {
    namespace Express {
        export interface Request {
            workspace?: string;
        }
    }
}

export async function requireWorkspace(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
        return res.status(400).json({ error: "Workspace ID is required" });
    }
    try {
        const workspace = await getWorkspace(id);
        return next();
    } catch (err: any) {
        return res.status(404).json({ error: `Workspace not found: ${id}`, message: err.message });
    }
}