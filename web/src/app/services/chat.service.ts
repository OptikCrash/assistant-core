import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/env.dev';

// Request types
export interface ChatRequest {
    message: string;
    workspacePath?: string;
    openFiles?: string[];
}

export interface ExecuteRequest {
    planId: string;
    confirmRisk?: boolean;
}

// Response types
export interface ToolCall {
    tool: string;
    input: Record<string, unknown>;
}

export interface TaskPlan {
    intent: string;
    reasoning: string;
    steps: string[];
    toolCalls: ToolCall[];
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PlanResponse {
    planId: string;
    plan: TaskPlan;
    requiresApproval: boolean;
    riskLevel: RiskLevel;
}

export interface ToolResult {
    tool: string;
    success: boolean;
    result?: unknown;
    error?: string;
}

export interface ExecuteResponse {
    executed: boolean;
    executionId: string;
    status: 'COMPLETED' | 'FAILED';
    riskLevel: RiskLevel;
    results: ToolResult[];
}

// Chat message types for UI
export type MessageRole = 'user' | 'assistant' | 'plan' | 'execution';

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    plan?: PlanResponse;
    execution?: ExecuteResponse;
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiBaseUrl;

    /**
     * Send a message to create a task plan
     */
    createPlan(request: ChatRequest): Observable<PlanResponse> {
        return this.http.post<PlanResponse>(`${this.baseUrl}/chat`, request);
    }

    /**
     * Execute a previously created plan
     */
    executePlan(request: ExecuteRequest): Observable<ExecuteResponse> {
        return this.http.post<ExecuteResponse>(`${this.baseUrl}/execute`, request);
    }
}
