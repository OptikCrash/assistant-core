"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectWorkspaceMetadata = detectWorkspaceMetadata;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function detectWorkspaceMetadata(rootPath) {
    const metadata = {
        languages: [],
        frameworks: [],
        databases: [],
        orm: [],
        testFrameworks: [],
        hasDocker: false
    };
    // --- Docker ---
    if (fs_1.default.existsSync(path_1.default.join(rootPath, "Dockerfile"))) {
        metadata.hasDocker = true;
    }
    // --- package.json ---
    const packageJsonPath = path_1.default.join(rootPath, "package.json");
    if (fs_1.default.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, "utf-8"));
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
        if (fs_1.default.existsSync(path_1.default.join(rootPath, "pnpm-lock.yaml"))) {
            metadata.packageManager = "pnpm";
        }
        else if (fs_1.default.existsSync(path_1.default.join(rootPath, "yarn.lock"))) {
            metadata.packageManager = "yarn";
        }
        else {
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
function detectGitBranches(rootPath) {
    try {
        let defaultBranch = "main";
        try {
            defaultBranch = (0, child_process_1.execSync)("git symbolic-ref refs/remotes/origin/HEAD", { cwd: rootPath })
                .toString()
                .trim()
                .replace("refs/remotes/origin/", "");
        }
        catch {
            // fallback
        }
        return { defaultBranch };
    }
    catch {
        return {};
    }
}
