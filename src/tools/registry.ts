import { RiskLevel } from './types';

export interface ToolDefinition {
    name: string;
    description: string;
    risk: RiskLevel;
}

export const TOOL_REGISTRY: ToolDefinition[] = [
    {
        name: "read_schema",
        description: "Read database schema metadata.",
        risk: "LOW"
    },
    {
        name: "generate_migration",
        description: "Generate SQL migration file.",
        risk: "HIGH"
    },
    {
        name: "update_sequelize_model",
        description: "Modify Sequelize model definitions.",
        risk: "HIGH"
    },
    {
        name: "update_angular_dto",
        description: "Modify Angular DTO and form structures.",
        risk: "MEDIUM"
    },
    {
        name: "get_git_diff",
        description: "Retrieve git diff for review.",
        risk: "LOW"
    },
    {
        name: "read_package_json",
        description: "Reads and parses package.json from the current workspace.",
        risk: "LOW"
    }

];
