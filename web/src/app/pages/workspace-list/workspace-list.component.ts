import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { WorkspaceCardComponent } from '../../components/workspace-card/workspace-card.component';
import { ChatSidebarService } from '../../services/chat-sidebar.service';
import { ThemeService } from '../../services/theme.service';
import { WorkspaceContext, WorkspaceService } from '../../services/workspace.service';

@Component({
    selector: 'app-workspace-list',
    standalone: true,
    imports: [
        CommonModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule,
        WorkspaceCardComponent
    ],
    templateUrl: './workspace-list.component.html',
    styleUrls: ['./workspace-list.component.scss']
})
export class WorkspaceListComponent {
    private workspaceService = inject(WorkspaceService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    themeService = inject(ThemeService);
    chatSidebarService = inject(ChatSidebarService);

    workspaces = signal<WorkspaceContext[]>([]);
    loading = signal(false);

    constructor() {
        this.loadWorkspaces();
    }

    loadWorkspaces(): void {
        this.loading.set(true);
        this.workspaceService.getWorkspaces().subscribe({
            next: (data) => {
                this.workspaces.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                this.snackBar.open(`Failed to load workspaces: ${err.message}`, 'Close', {
                    duration: 5000
                });
                this.loading.set(false);
            }
        });
    }

    onRefreshRuntime(id: string): void {
        this.workspaceService.refreshRuntime(id).subscribe({
            next: (runtime) => {
                // Update the workspace in the list with new runtime
                const updated = this.workspaces().map(ws =>
                    ws.id === id ? { ...ws, runtime } : ws
                );
                this.workspaces.set(updated);
                this.snackBar.open('Runtime refreshed', 'Close', { duration: 2000 });
            },
            error: (err) => {
                this.snackBar.open(`Failed to refresh: ${err.message}`, 'Close', {
                    duration: 5000
                });
            }
        });
    }

    onViewDetails(id: string): void {
        this.router.navigate(['/workspace', id]);
    }

    onDeleteWorkspace(id: string): void {
        if (confirm(`Are you sure you want to remove workspace "${id}"?`)) {
            this.workspaceService.unregisterWorkspace(id).subscribe({
                next: () => {
                    this.workspaces.set(this.workspaces().filter(ws => ws.id !== id));
                    this.snackBar.open('Workspace removed', 'Close', { duration: 2000 });
                },
                error: (err) => {
                    this.snackBar.open(`Failed to remove: ${err.message}`, 'Close', {
                        duration: 5000
                    });
                }
            });
        }
    }

    onAddWorkspace(): void {
        this.router.navigate(['/workspace/new']);
    }

    refreshAll(): void {
        this.loadWorkspaces();
    }
}
