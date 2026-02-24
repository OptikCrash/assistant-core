import { LLMProvider } from "../../../llm/types";
import { getGitDiffTool } from "../../../tools/getGitDiff";
import { readFileTool } from "../../../tools/readFile";
import { RiskLevel } from "../../../tools/types";
import { detectWorkspaceRuntime } from "../../../workspace/workspaceRuntimeDetector";
import { buildSmartFilePrompt } from "./smartPrompt";
import { DiffReview, FileReview, ImportSpec, StructuredIssue } from "./types";

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
    imports: ImportSpec[];
    exports: string[];
    exportChanges: {
        added: string[];
        removed: string[];
    };
    methodChanges: {
        added: string[];
        removed: string[];
    };
}

export class ReviewEngine {
    private totalEstimatedTokens = 0;
    private tasks: ReviewTask[] = [];
    private readonly riskWeights = {
        BREAKING_CHANGE: 30,
        METHOD_REMOVAL: 20,
        METHOD_ADDITION: 5,
        EXPORT_REMOVAL: 25,
        EXPORT_ADDITION: 5,
        MIGRATION_TOUCH: 15,
        CROSS_FILE_HIGH: 25,
        CROSS_FILE_CRITICAL: 40,
        ARCH_CONCERN: 10,
        SCHEMA_CONCERN: 15
    }

    constructor(
        private provider: LLMProvider,
        private workspaceRoot: string
    ) { }

    async run(): Promise<DiffReview> {
        const runtime = detectWorkspaceRuntime(this.workspaceRoot);
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
        const result = await getGitDiffTool.execute({
            rootPath: this.workspaceRoot,
            staged: true
        });

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
                rootPath: this.workspaceRoot,
                filePath: filename
            });
            fullFileContent = fileResult.content;
        } catch {
            fullFileContent = "";
        }

        const { scanDependencies } = await import("./dependencyScanner");
        const depInfo = scanDependencies(fullFileContent || "");

        // 🔥 NEW: detect changed exports from diff
        const exportChanges = this.extractExportChanges(fileDiff);
        const methodChanges = this.extractMethodSignatureChanges(fileDiff);

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
            estimatedTokens,
            imports: depInfo.imports,
            exports: depInfo.exports,
            exportChanges,
            methodChanges: methodChanges
        };
    }
    //#endregion
    //#region Stage 3 — Parallel Execution
    private async executeTasks(): Promise<FileReview[]> {
        return this.parallelMap(
            this.tasks,
            MAX_PARALLEL_REVIEWS,
            async (task) => {

                const review =
                    await this.provider.generateStructuredJson<DiffReview>(
                        task.prompt
                    );

                const normalizedReview: DiffReview = {
                    summary: review.summary ?? "",
                    breakingChanges: review.breakingChanges ?? [],
                    risks: review.risks ?? [],
                    suggestions: review.suggestions ?? [],
                    missingTests: review.missingTests ?? [],
                    schemaConcerns: review.schemaConcerns ?? [],
                    crossFileRisks: review.crossFileRisks ?? [],
                    architecturalConcerns: review.architecturalConcerns ?? [],
                    overallRisk: review.overallRisk ?? "LOW",
                    confidence: review.confidence ?? 0
                };

                // Normalize filename
                const normalizedFilename = this.normalizeFilename(task.filename);

                // Normalize imports to resolved module paths
                const normalizedImports = task.imports.map(i => ({
                    ...i,
                    module: this.resolveImportModule(task.filename, i.module)
                }));

                return {
                    filename: normalizedFilename,
                    fileType: this.classifyFile(task.filename),
                    imports: normalizedImports,
                    exports: task.exports,
                    exportChanges: task.exportChanges,
                    methodChanges: task.methodChanges,
                    review: normalizedReview
                };
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
        fileReviews: FileReview[],
        crossFile?: {
            crossFileRisks: StructuredIssue[];
            architecturalConcerns: StructuredIssue[];
        }
    ): DiffReview {
        const runtime = detectWorkspaceRuntime(this.workspaceRoot);
        const crossFileRisks = crossFile?.crossFileRisks ?? [];
        const architecturalConcerns = crossFile?.architecturalConcerns ?? [];

        const overallRisk = this.computeOverallSeverity(
            fileReviews,
            crossFileRisks,
            architecturalConcerns
        );

        const confidence = this.computeConfidence(
            fileReviews,
            crossFileRisks
        );

        return {
            summary: fileReviews
                .map(r => r.review.summary)
                .join("\n"),

            breakingChanges: fileReviews.flatMap(r => r.review.breakingChanges),
            risks: fileReviews.flatMap(r => r.review.risks),
            suggestions: fileReviews.flatMap(r => r.review.suggestions),
            missingTests: fileReviews.flatMap(r => r.review.missingTests),
            schemaConcerns: fileReviews.flatMap(r => r.review.schemaConcerns),
            crossFileRisks,
            architecturalConcerns,
            overallRisk,
            confidence,
            runtime
        };
    }

    private async runCrossFileAnalysis(
        fileReviews: FileReview[]
    ): Promise<{
        crossFileRisks: StructuredIssue[];
        architecturalConcerns: StructuredIssue[];
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
            crossFileRisks: StructuredIssue[];
            architecturalConcerns: StructuredIssue[];
        }>(prompt);
    }

    private normalizeFilename(path: string): string {
        return path
            .replace(/^\.\/+/, "")
            .replace(/\.ts$/, "")
            .replace(/\\/g, "/");
    }

    private resolveImportModule(
        importerFilename: string,
        moduleSpecifier: string
    ): string {

        if (!moduleSpecifier.startsWith(".")) {
            return moduleSpecifier; // external package
        }

        const baseDir = importerFilename.substring(
            0,
            importerFilename.lastIndexOf("/")
        );

        const combined = `${baseDir}/${moduleSpecifier}`
            .replace(/\/\.\//g, "/")
            .replace(/\/[^/]+\/\.\.\//g, "/");

        return this.normalizeFilename(combined);
    }

    private extractExportChanges(diff: string): {
        added: string[];
        removed: string[];
    } {

        const added: string[] = [];
        const removed: string[] = [];

        const addRegex =
            /^\+export\s+(?:class|function|interface|const|type)\s+(\w+)/gm;

        const removeRegex =
            /^\-export\s+(?:class|function|interface|const|type)\s+(\w+)/gm;

        let match;

        while ((match = addRegex.exec(diff)) !== null) {
            added.push(match[1]);
        }

        while ((match = removeRegex.exec(diff)) !== null) {
            removed.push(match[1]);
        }

        return { added, removed };
    }

    private extractMethodSignatureChanges(diff: string): {
        added: string[];
        removed: string[];
    } {

        const added: string[] = [];
        const removed: string[] = [];

        const methodRegex =
            /^(?<prefix>[+-])\s*(?:public\s+)?(?:async\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*:\s*([A-Za-z0-9_<>\[\]\|]+)/gm;

        let match: RegExpExecArray | null;

        while ((match = methodRegex.exec(diff)) !== null) {
            const prefix = match.groups?.prefix;
            const methodName = match[2];
            const params = match[3];
            const returnType = match[4];

            const signature = `${methodName}(${params}): ${returnType}`;

            if (prefix === "+") added.push(signature);
            if (prefix === "-") removed.push(signature);
        }

        return { added, removed };
    }

    private computeOverallSeverity(
        fileReviews: FileReview[],
        crossFileRisks: StructuredIssue[],
        architecturalConcerns: StructuredIssue[]
    ): RiskLevel {

        let score = 0;

        for (const review of fileReviews) {

            if ((review.review.breakingChanges ?? []).length > 0) {
                score += this.riskWeights.BREAKING_CHANGE;
            }

            score += (review.methodChanges?.removed ?? []).length *
                this.riskWeights.METHOD_REMOVAL;

            score += review.methodChanges.added.length *
                this.riskWeights.METHOD_ADDITION;

            score += (review.exportChanges?.removed ?? []).length *
                this.riskWeights.EXPORT_REMOVAL;

            score += review.exportChanges.added.length *
                this.riskWeights.EXPORT_ADDITION;

            if (review.fileType === "migration") {
                score += this.riskWeights.MIGRATION_TOUCH;
            }

            score += (review.review.schemaConcerns ?? []).length *
                this.riskWeights.SCHEMA_CONCERN;
        }

        for (const issue of crossFileRisks) {
            if (issue.risk === "CRITICAL") {
                score += this.riskWeights.CROSS_FILE_CRITICAL;
            } else if (issue.risk === "HIGH") {
                score += this.riskWeights.CROSS_FILE_HIGH;
            }
        }

        score += architecturalConcerns.length *
            this.riskWeights.ARCH_CONCERN;

        // Map numeric score to RiskLevel
        if (score >= 70) return "CRITICAL";
        if (score >= 40) return "HIGH";
        if (score >= 20) return "MEDIUM";
        return "LOW";
    }

    private computeConfidence(
        fileReviews: FileReview[],
        crossFileRisks: StructuredIssue[]
    ): number {

        let confidence = 0;

        for (const review of fileReviews) {

            if ((review.exportChanges?.removed ?? []).length > 0) {
                confidence += 20;
            }

            if ((review.methodChanges?.removed ?? []).length > 0) {
                confidence += 15;
            }

            if ((review.review.breakingChanges ?? []).length > 0) {
                confidence += 25;
            }
        }

        for (const issue of crossFileRisks) {
            if (issue.risk === "CRITICAL") {
                confidence += 40;
            } else if (issue.risk === "HIGH") {
                confidence += 25;
            }
        }

        return Math.min(confidence, 100);
    }
    //#endregion
}
