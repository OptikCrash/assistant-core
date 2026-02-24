import { Router } from "express";
import { reviewSmartDiff } from "../features/git/review/reviewSmartService";

export const reviewSmartRouter = Router();

reviewSmartRouter.post("/", async (req, res) => {
    try {
        const { workspaceId } = req.body;

        if (!workspaceId) {
            return res.status(400).json({
                error: "workspaceId is required"
            });
        }

        const result = await reviewSmartDiff(workspaceId);

        res.json(result);

    } catch (err: any) {
        res.status(500).json({
            error: err.message
        });
    }
});
