import fs from "fs/promises";
import path from "path";

export async function detectWorkspaceStack(rootPath: string) {

    const result = {
        isNode: false,
        isAngular: false,
        isSequelize: false,
        isPostgres: false,
        isGitRepo: false
    };

    try {
        await fs.access(path.join(rootPath, ".git"));
        result.isGitRepo = true;
    } catch { }

    try {
        const pkg = JSON.parse(
            await fs.readFile(path.join(rootPath, "package.json"), "utf-8")
        );

        result.isNode = true;

        if (pkg.dependencies?.["@angular/core"])
            result.isAngular = true;

        if (pkg.dependencies?.["sequelize"])
            result.isSequelize = true;

        if (pkg.dependencies?.["pg"])
            result.isPostgres = true;

    } catch { }

    return result;
}