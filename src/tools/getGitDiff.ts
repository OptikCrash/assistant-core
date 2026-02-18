import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { Tool } from './types';

const execAsync = promisify(exec);

const GetGitDiffSchema = z.object({
    staged: z.boolean().optional(),
    baseBranch: z.string().optional()
});

type GetGitDiffInput = z.infer<typeof GetGitDiffSchema>;

export const getGitDiffTool: Tool<GetGitDiffInput> = {
    name: "get_git_diff",
    risk: "LOW",
    schema: GetGitDiffSchema,

    async execute(input) {

        let command = "git diff";

        if (input.staged) {
            command = "git diff --staged";
        } else if (input.baseBranch) {
            command = `git diff ${input.baseBranch}`;
        }

        const { stdout } = await execAsync(command, {
            maxBuffer: 10 * 1024 * 1024
        });

        return {
            diff: stdout
        };
    }
};
