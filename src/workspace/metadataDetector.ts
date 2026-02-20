import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { WorkspaceStaticMetadata } from "./types";

export async function detectWorkspaceMetadata(
    rootPath: string
): Promise<WorkspaceStaticMetadata> {

    const metadata: WorkspaceStaticMetadata = {
        languages: [],
        frameworks: [],
        databases: [],
        orm: [],
        testFrameworks: [],
        hasDocker: false
    };

    // --- Docker ---
    if (fs.existsSync(path.join(rootPath, "Dockerfile"))) {
        metadata.hasDocker = true;
    }

    // --- package.json ---
    const packageJsonPath = path.join(rootPath, "package.json");

    if (fs.existsSync(packageJsonPath)) {

        const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf-8")
        );

        metadata.languages.push("TypeScript");

        const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        const depKeys = Object.keys(deps || {});

        if (depKeys.includes("express")) {
            metadata.frameworks.push("Express");
        }

        if (depKeys.includes("@angular/core")) {
            metadata.frameworks.push("Angular");
        }

        if (depKeys.includes("react")) {
            metadata.frameworks.push("React");
        }

        if (depKeys.includes("sequelize")) {
            metadata.orm.push("Sequelize");
        }

        if (depKeys.includes("typeorm")) {
            metadata.orm.push("TypeORM");
        }

        if (depKeys.includes("pg")) {
            metadata.databases.push("PostgreSQL");
        }

        if (depKeys.includes("jest")) {
            metadata.testFrameworks.push("Jest");
        }

        if (depKeys.includes("vitest")) {
            metadata.testFrameworks.push("Vitest");
        }

        if (fs.existsSync(path.join(rootPath, "pnpm-lock.yaml"))) {
            metadata.packageManager = "pnpm";
        } else if (fs.existsSync(path.join(rootPath, "yarn.lock"))) {
            metadata.packageManager = "yarn";
        } else {
            metadata.packageManager = "npm";
        }
    }

    // --- default branch detection (static) ---
    const branchInfo = detectGitBranches(rootPath);

    if (branchInfo.defaultBranch) {
        metadata.defaultBranch = branchInfo.defaultBranch;
    }

    return metadata;
}

function detectGitBranches(rootPath: string) {
    try {
        let defaultBranch = "main";

        try {
            defaultBranch = execSync(
                "git symbolic-ref refs/remotes/origin/HEAD",
                { cwd: rootPath }
            )
                .toString()
                .trim()
                .replace("refs/remotes/origin/", "");
        } catch {
            // fallback
        }

        return { defaultBranch };
    } catch {
        return {};
    }
}