import { LLMProvider } from "../../../llm/types";
import { getGitDiffTool } from "../../../tools/getGitDiff";
import { readFileTool } from "../../../tools/readFile";
import { buildSmartFilePrompt } from "./smartPrompt";
import { DiffReview } from "./types";

const SMALL_FILE_LIMIT = 8000;
const MEDIUM_FILE_LIMIT = 20000;
const CONTEXT_LINES = 20;

const MAX_PARALLEL_REVIEWS = 4;
const MAX_TOKENS_PER_FILE = 6000;
const MAX_TOTAL_TOKENS = 20000;

interface ReviewTask {
    filename: string;
    prompt: string;
    estimatedTokens: number;
}

export class ReviewEngine {

    private totalEstimatedTokens = 0;
    private tasks: ReviewTask[] = [];

    constructor(
        private provider: LLMProvider
    ) { }

    async run(): Promise<DiffReview> {
        const diff = await this.getDiff();

        if (!diff || diff.trim().length === 0) {
            throw new Error("No diff found.");
        }

        const fileDiffs = this.splitDiffByFile(diff);

        await this.prepareTasks(fileDiffs);

        const fileReviews = await this.executeTasks();

        const crossFile = await this.runCrossFileAnalysis(fileReviews);

        return this.aggregateReviews(fileReviews, crossFile);
    }

    //#region Stage 1 — Diff Retrieval
    private async getDiff(): Promise<string> {
        const result = await getGitDiffTool.execute({ staged: true });
        return result.diff;
    }
    //#endregion
    //#region Stage 2 — Task Preparation
    private async prepareTasks(fileDiffs: string[]) {
        for (const fileDiff of fileDiffs) {
            const task = await this.buildTask(fileDiff);
            if (task) {
                this.tasks.push(task);
            }
        }

        console.log(`Prepared ${this.tasks.length} review tasks`);
        console.log(`Estimated total tokens: ${this.totalEstimatedTokens}`);
    }

    private async buildTask(fileDiff: string): Promise<ReviewTask | null> {
        const filename = this.extractFilename(fileDiff);

        if (this.shouldIgnoreFile(filename)) return null;

        const fileType = this.classifyFile(filename);

        let fullFileContent = "";
        try {
            const fileResult = await readFileTool.execute({
                filePath: filename
            });
            fullFileContent = fileResult.content;
        } catch {
            fullFileContent = "";
        }

        const analysisContent = this.buildHybridContext(
            fullFileContent,
            fileDiff
        );

        const prompt = buildSmartFilePrompt(
            filename,
            fileType,
            analysisContent,
            fileDiff
        );

        const estimatedTokens = this.estimateTokens(prompt);

        if (estimatedTokens > MAX_TOKENS_PER_FILE) {
            console.warn(`Skipping ${filename} — exceeds per-file limit`);
            return null;
        }

        if (this.totalEstimatedTokens + estimatedTokens > MAX_TOTAL_TOKENS) {
            console.warn(`Skipping ${filename} — exceeds total budget`);
            return null;
        }

        this.totalEstimatedTokens += estimatedTokens;

        return {
            filename,
            prompt,
            estimatedTokens
        };
    }
    //#endregion
    //#region Stage 3 — Parallel Execution
    private async executeTasks(): Promise<DiffReview[]> {
        return this.parallelMap(
            this.tasks,
            MAX_PARALLEL_REVIEWS,
            async (task) => {
                return this.provider.generateStructuredJson<DiffReview>(
                    task.prompt
                );
            }
        );
    }
    //#endregion
    //#region Utilities
    private splitDiffByFile(diff: string): string[] {
        return diff
            .split(/^diff --git/m)
            .filter(chunk => chunk.trim().length > 0)
            .map(chunk => "diff --git" + chunk);
    }

    private extractFilename(fileDiff: string): string {
        const match = fileDiff.match(/^diff --git a\/(.+?) b\//m);
        return match ? match[1] : "unknown";
    }

    private shouldIgnoreFile(filename: string): boolean {
        return (
            filename.includes("node_modules") ||
            filename.endsWith(".lock") ||
            filename.includes("dist/")
        );
    }

    private classifyFile(filename: string): string {
        if (filename.includes("migration")) return "migration";
        if (filename.includes("models")) return "model";
        if (filename.includes("dto")) return "dto";
        if (filename.endsWith(".ts")) return "typescript";
        return "general";
    }

    private buildHybridContext(
        fullFileContent: string,
        fileDiff: string
    ): string {

        if (!fullFileContent) return fileDiff;

        if (fullFileContent.length <= SMALL_FILE_LIMIT) {
            return fullFileContent;
        }

        if (fullFileContent.length <= MEDIUM_FILE_LIMIT) {
            const changedLines = this.extractChangedLineRanges(fileDiff);
            return this.extractContextWindow(
                fullFileContent,
                changedLines,
                CONTEXT_LINES
            );
        }

        return fileDiff;
    }

    private extractChangedLineRanges(diff: string): number[] {
        const ranges: number[] = [];
        const regex = /@@ -\d+,\d+ \+(\d+),(\d+) @@/g;

        let match;
        while ((match = regex.exec(diff)) !== null) {
            const start = parseInt(match[1], 10);
            const count = parseInt(match[2], 10);

            for (let i = 0; i < count; i++) {
                ranges.push(start + i);
            }
        }

        return ranges;
    }

    private extractContextWindow(
        fullFile: string,
        changedLines: number[],
        contextLines: number
    ): string {

        const lines = fullFile.split("\n");
        const included = new Set<number>();

        for (const lineNumber of changedLines) {
            for (let i = lineNumber - contextLines; i <= lineNumber + contextLines; i++) {
                if (i > 0 && i <= lines.length) {
                    included.add(i - 1);
                }
            }
        }

        const sorted = Array.from(included).sort((a, b) => a - b);

        return sorted.map(i => lines[i]).join("\n");
    }

    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    private async parallelMap<T, R>(
        items: T[],
        limit: number,
        mapper: (item: T) => Promise<R>
    ): Promise<R[]> {

        const results: R[] = [];
        const executing: Promise<void>[] = [];

        for (const item of items) {
            const p = (async () => {
                const result = await mapper(item);
                results.push(result);
            })();

            executing.push(p);

            if (executing.length >= limit) {
                await Promise.race(executing);
                executing.splice(0, 1);
            }
        }

        await Promise.all(executing);
        return results;
    }

    private aggregateReviews(
        fileReviews: DiffReview[],
        crossFile?: {
            crossFileRisks: string[];
            architecturalConcerns: string[];
        }
    ): DiffReview {

        return {
            summary: fileReviews.map(r => r.summary).join("\n"),
            breakingChanges: fileReviews.flatMap(r => r.breakingChanges),
            risks: fileReviews.flatMap(r => r.risks),
            suggestions: fileReviews.flatMap(r => r.suggestions),
            missingTests: fileReviews.flatMap(r => r.missingTests),
            schemaConcerns: fileReviews.flatMap(r => r.schemaConcerns),

            crossFileRisks: crossFile?.crossFileRisks ?? [],
            architecturalConcerns: crossFile?.architecturalConcerns ?? []
        };
    }

    private async runCrossFileAnalysis(
        fileReviews: DiffReview[]
    ): Promise<{
        crossFileRisks: string[];
        architecturalConcerns: string[];
    }> {

        if (fileReviews.length <= 1) {
            return {
                crossFileRisks: [],
                architecturalConcerns: []
            };
        }

        const { buildCrossFilePrompt } = await import("./buildCrossFilePrompt");

        const prompt = buildCrossFilePrompt(fileReviews);

        return this.provider.generateStructuredJson<{
            crossFileRisks: string[];
            architecturalConcerns: string[];
        }>(prompt);
    }
    //#endregion
}
