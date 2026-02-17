export interface ChatRequest {
    message: string;
    workspacePath?: string;
    openFiles?: string[];
}

export interface ToolCall {
    tool: string;
    input: Record<string, any>;
}

export interface TaskPlan {
    intent: string;
    reasoning: string;
    steps: string[];
    toolCalls: ToolCall[];
}
