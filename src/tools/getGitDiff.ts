import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { Tool } from './types';

const execAsync = promisify(exec);

const GetGitDiffSchema = z.object({
    rootPath: z.string(),
    staged: z.boolean().optional(),
    baseBranch: z.string().optional()
});

type GetGitDiffInput = z.infer<typeof GetGitDiffSchema>;

export const getGitDiffTool: Tool<GetGitDiffInput> = {
    name: "get_git_diff",
    risk: "LOW",
    schema: GetGitDiffSchema,

    async execute(input) {
        const { rootPath, staged, baseBranch } = input;

        let command = "git diff";

        if (staged) {
            command = "git diff --staged";
        } else if (baseBranch) {
            command = `git diff ${baseBranch}`;
        }

        const { stdout } = await execAsync(command, {
            cwd: rootPath,
            maxBuffer: 10 * 1024 * 1024
        });

        return { diff: stdout };
    }
};
