import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/env.dev';

export interface WorkspaceStaticMetadata {
    languages: string[];
    frameworks: string[];
    databases: string[];
    orm: string[];
    testFrameworks: string[];
    packageManager?: string;
    hasDocker: boolean;
    defaultBranch?: string;
}

export interface WorkspaceRuntimeState {
    currentBranch?: string;
    hasUncommittedChanges: boolean;
    hasStagedChanges: boolean;
    aheadBy?: number;
    behindBy?: number;
    dirty: boolean;
    untrackedFiles: number;
    lastCommitHash: string;
    lastCommitDate: string;
}

export interface WorkspaceContext {
    id: string;
    rootPath: string;
    metadata: WorkspaceStaticMetadata;
    runtime?: WorkspaceRuntimeState;
}

export interface WorkspaceIndexFile {
    path: string;
    size: number;
    type: 'file' | 'directory';
}

export interface WorkspaceIndex {
    workspaceId: string;
    indexedAt: string;
    files: WorkspaceIndexFile[];
    lastIndexedCommit: string;
}

export interface WorkspaceValidationResult {
    valid: boolean;
    reason?: string;
    metadata?: WorkspaceStaticMetadata;
}

export interface WorkspaceValidateResult {
    exists: boolean;
    isGitRepo: boolean;
    hasPackageJson: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class WorkspaceService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiBaseUrl;

    // ---------------------------------------------------
    // Retrieval
    // ---------------------------------------------------

    getWorkspaces(): Observable<WorkspaceContext[]> {
        return this.http.get<WorkspaceContext[]>(`${this.baseUrl}/workspace`);
    }

    getWorkspace(id: string): Observable<WorkspaceContext> {
        return this.http.get<WorkspaceContext>(`${this.baseUrl}/workspace/${id}`);
    }

    // ---------------------------------------------------
    // Registration
    // ---------------------------------------------------

    registerWorkspace(id: string, rootPath: string): Observable<WorkspaceContext> {
        return this.http.post<WorkspaceContext>(
            `${this.baseUrl}/workspace/register`,
            { id, rootPath }
        );
    }

    unregisterWorkspace(id: string): Observable<{ success: boolean }> {
        return this.http.delete<{ success: boolean }>(`${this.baseUrl}/workspace/${id}`);
    }

    validateWorkspace(rootPath: string): Observable<WorkspaceValidateResult> {
        return this.http.post<WorkspaceValidateResult>(
            `${this.baseUrl}/workspace/validate`,
            { rootPath }
        );
    }

    // ---------------------------------------------------
    // Runtime
    // ---------------------------------------------------

    getRuntime(id: string): Observable<WorkspaceRuntimeState> {
        return this.http.get<WorkspaceRuntimeState>(`${this.baseUrl}/workspace/${id}/runtime`);
    }

    refreshRuntime(id: string): Observable<WorkspaceRuntimeState> {
        return this.http.post<WorkspaceRuntimeState>(
            `${this.baseUrl}/workspace/${id}/runtime/refresh`,
            {}
        );
    }

    getStatus(id: string): Observable<WorkspaceRuntimeState> {
        return this.http.get<WorkspaceRuntimeState>(`${this.baseUrl}/workspace/${id}/status`);
    }

    // ---------------------------------------------------
    // Metadata
    // ---------------------------------------------------

    getMetadata(id: string): Observable<WorkspaceStaticMetadata> {
        return this.http.get<WorkspaceStaticMetadata>(`${this.baseUrl}/workspace/${id}/metadata`);
    }

    // ---------------------------------------------------
    // Indexing
    // ---------------------------------------------------

    getIndex(id: string): Observable<WorkspaceIndex> {
        return this.http.get<WorkspaceIndex>(`${this.baseUrl}/workspace/${id}/index`);
    }

    refreshIndex(id: string, depth = 5): Observable<WorkspaceIndex> {
        return this.http.post<WorkspaceIndex>(
            `${this.baseUrl}/workspace/${id}/index/refresh`,
            { depth }
        );
    }
}