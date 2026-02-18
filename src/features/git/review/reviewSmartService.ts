import { createProvider } from "../../../llm/providerFactory";
import { getGitDiffTool } from "../../../tools/getGitDiff";
import { readFileTool } from "../../../tools/readFile";
import { buildSmartFilePrompt } from "./smartPrompt";
import { DiffReview } from "./types";

const provider = createProvider();

const SMALL_FILE_LIMIT = 8000;      // characters
const MEDIUM_FILE_LIMIT = 20000;    // characters
const CONTEXT_LINES = 20;

const MAX_PARALLEL_REVIEWS = 4;

const MAX_TOKENS_PER_FILE = 6000;
const MAX_TOTAL_TOKENS = 20000;



export async function reviewSmartDiff(): Promise<DiffReview> {
    const diffResult = await getGitDiffTool.execute({ staged: true });
    const diff = diffResult.diff;

    if (!diff || diff.trim().length === 0) {
        throw new Error("No diff found.");
    }

    const fileDiffs = splitDiffByFile(diff);

    // 🔥 First pass: build prompts + estimate tokens
    const reviewTasks: {
        fileDiff: string;
        prompt: string;
        estimatedTokens: number;
    }[] = [];

    let totalEstimatedTokens = 0;

    for (const fileDiff of fileDiffs) {
        const filename = extractFilename(fileDiff);

        if (shouldIgnoreFile(filename)) continue;

        const fileType = classifyFile(filename);

        let fullFileContent = "";
        try {
            const fileResult = await readFileTool.execute({
                filePath: filename
            });
            fullFileContent = fileResult.content;
        } catch {
            fullFileContent = "";
        }

        const analysisContent = buildHybridContext(
            fullFileContent,
            fileDiff
        );

        const prompt = buildSmartFilePrompt(
            filename,
            fileType,
            analysisContent,
            fileDiff
        );

        const estimatedTokens = estimateTokens(prompt);

        if (estimatedTokens > MAX_TOKENS_PER_FILE) {
            console.warn(`Skipping ${filename} — exceeds per-file token limit`);
            continue;
        }

        if (totalEstimatedTokens + estimatedTokens > MAX_TOTAL_TOKENS) {
            console.warn(`Skipping ${filename} — exceeds total token budget`);
            continue;
        }

        totalEstimatedTokens += estimatedTokens;

        reviewTasks.push({
            fileDiff,
            prompt,
            estimatedTokens
        });
    }

    console.log(`Reviewing ${reviewTasks.length} files`);
    console.log(`Estimated total tokens: ${totalEstimatedTokens}`);

    // 🔥 Parallel execution (safe)
    const fileReviews = await parallelMap(
        reviewTasks,
        MAX_PARALLEL_REVIEWS,
        async (task) => {
            return provider.generateStructuredJson<DiffReview>(
                task.prompt
            );
        }
    );

    return aggregateReviews(fileReviews);
}

function splitDiffByFile(diff: string): string[] {
    return diff
        .split(/^diff --git/m)
        .filter(chunk => chunk.trim().length > 0)
        .map(chunk => "diff --git" + chunk);
}

function extractFilename(fileDiff: string): string {
    const match = fileDiff.match(/^diff --git a\/(.+?) b\//m);
    return match ? match[1] : "unknown";
}

function shouldIgnoreFile(filename: string): boolean {
    return (
        filename.includes("node_modules") ||
        filename.endsWith(".lock") ||
        filename.includes("dist/")
    );
}

function classifyFile(filename: string): string {
    if (filename.includes("migration")) return "migration";
    if (filename.includes("models")) return "model";
    if (filename.includes("dto")) return "dto";
    if (filename.endsWith(".ts")) return "typescript";
    return "general";
}

function aggregateReviews(reviews: DiffReview[]): DiffReview {
    return {
        summary: reviews.map(r => r.summary).join("\n"),
        breakingChanges: reviews.flatMap(r => r.breakingChanges),
        risks: reviews.flatMap(r => r.risks),
        suggestions: reviews.flatMap(r => r.suggestions),
        missingTests: reviews.flatMap(r => r.missingTests),
        schemaConcerns: reviews.flatMap(r => r.schemaConcerns)
    };
}

function extractChangedLineRanges(diff: string): number[] {
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

function extractContextWindow(
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

function buildHybridContext(
    fullFileContent: string,
    fileDiff: string
): string {

    if (!fullFileContent) {
        return fileDiff;
    }

    if (fullFileContent.length <= SMALL_FILE_LIMIT) {
        return fullFileContent;
    }

    if (fullFileContent.length <= MEDIUM_FILE_LIMIT) {
        const changedLines = extractChangedLineRanges(fileDiff);
        return extractContextWindow(
            fullFileContent,
            changedLines,
            CONTEXT_LINES
        );
    }

    return fileDiff;
}

async function parallelMap<T, R>(
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

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}
