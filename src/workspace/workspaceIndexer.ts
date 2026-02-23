import { listDirectoryTool } from "../tools/listDirectoryTool";
import { loadAssistantIgnore, shouldIndexFile } from "./indexing/filterRules";
import { getWorkspace } from "./workspaceRegistry";

const DEFAULT_EXCLUDES = [
    ".git",
    "node_modules",
    ".DS_Store",
    "dist",
    "build"
];

interface IndexedFile {
    path: string;
    size: number;
    type: "file" | "directory";
}

export interface WorkspaceIndex {
    workspaceId: string;
    indexedAt: string;
    files: IndexedFile[];
}

const indexCache = new Map<string, WorkspaceIndex>();
export async function refreshWorkspaceIndex(
    workspaceId: string,
    depth = 5
): Promise<WorkspaceIndex> {

    const workspace = await getWorkspace(workspaceId);
    const ignorePatterns = loadAssistantIgnore(workspace.rootPath);
    const result = await listDirectoryTool.execute({
        rootPath: workspace.rootPath,
        directory: "",
        maxDepth: depth
    });

    if (!Array.isArray(result.tree)) {
        throw new Error("Invalid tree result from listDirectoryTool");
    }

    const indexed: IndexedFile[] = [];
    flattenTree(result.tree, indexed);

    const index: WorkspaceIndex = {
        workspaceId,
        indexedAt: new Date().toISOString(),
        files: indexed
    };

    indexCache.set(workspaceId, index);

    return index;
}

export function getWorkspaceIndex(
    workspaceId: string
): WorkspaceIndex | null {
    return indexCache.get(workspaceId) ?? null;
}

function flattenTree(
    nodes: any[],
    result: IndexedFile[],
    basePath = ""
) {

    for (const node of nodes) {

        const fullPath = node.path;

        if (!shouldIndexFile(fullPath, node.type)) {
            continue;
        }

        if (node.type === "file") {
            result.push({
                path: fullPath,
                size: node.size ?? 0,
                type: "file"
            });
        }

        if (node.type === "directory" && node.children) {
            flattenTree(node.children, result, fullPath);
        }
    }
}