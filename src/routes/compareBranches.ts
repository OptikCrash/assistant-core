import { Router } from "express";
import { z } from "zod";
import { compareBranches } from "../features/git/compare/branchComparisonService";
import { BranchMergeConflictError } from "../features/git/compare/types";

const CompareBranchesSchema = z.object({
    workspaceId: z.string().min(1),
    yourRef: z.string().min(1),
    theirBaseRef: z.string().min(1),
    theirMergeRefs: z.array(z.string().min(1)).optional(),
    baseRef: z.string().min(1).optional(),
    fetch: z.boolean().optional(),
    remote: z.string().min(1).optional(),
    includePatches: z.boolean().optional()
});

export const compareBranchesRouter = Router();

compareBranchesRouter.post("/", async (req, res) => {
    try {
        const input = CompareBranchesSchema.parse(req.body);
        const result = await compareBranches(input);

        res.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Invalid request body",
                details: error.flatten()
            });
        }

        if (error instanceof BranchMergeConflictError) {
            return res.status(409).json({
                error: error.message,
                mergeRef: error.mergeRef,
                conflictFiles: error.conflictFiles,
                commandOutput: error.commandOutput
            });
        }

        return res.status(500).json({
            error: error.message
        });
    }
});
