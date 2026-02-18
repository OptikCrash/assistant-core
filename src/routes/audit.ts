import { Router } from 'express';
import { getExecution } from '../audit/executionLogStore';

export const auditRouter = Router();

auditRouter.get('/:executionId', (req, res) => {
    const { executionId } = req.params;

    const record = getExecution(executionId);

    if (!record) {
        return res.status(404).json({ error: "Execution not found" });
    }

    return res.json(record);
});
