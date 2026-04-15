import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { OcticonComponent, OCTICONS } from '../../components/octicon/octicon.component';
import { TechBadgeComponent } from '../../components/tech-badge/tech-badge.component';
import { ChatSidebarService } from '../../services/chat-sidebar.service';
import { ThemeService } from '../../services/theme.service';
import {
    WorkspaceContext,
    WorkspaceIndex,
    WorkspaceService
} from '../../services/workspace.service';

@Component({
    selector: 'app-workspace-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatTabsModule,
        MatListModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule,
        TechBadgeComponent,
        OcticonComponent
    ],
    templateUrl: './workspace-detail.component.html',
    styleUrls: ['./workspace-detail.component.scss']
})
export class WorkspaceDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private workspaceService = inject(WorkspaceService);
    private snackBar = inject(MatSnackBar);
    themeService = inject(ThemeService);
    chatSidebarService = inject(ChatSidebarService);
    icons = OCTICONS;

    workspace = signal<WorkspaceContext | null>(null);
    index = signal<WorkspaceIndex | null>(null);
    loading = signal(false);
    indexLoading = signal(false);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadWorkspace(id);
        }
    }

    loadWorkspace(id: string): void {
        this.loading.set(true);
        this.workspaceService.getWorkspace(id).subscribe({
            next: (data) => {
                this.workspace.set(data);
                this.loading.set(false);
                this.loadIndex(id);
            },
            error: (err) => {
                this.snackBar.open(`Failed to load workspace: ${err.message}`, 'Close', {
                    duration: 5000
                });
                this.loading.set(false);
            }
        });
    }

    loadIndex(id: string): void {
        this.indexLoading.set(true);
        this.workspaceService.getIndex(id).subscribe({
            next: (data) => {
                this.index.set(data);
                this.indexLoading.set(false);
            },
            error: () => {
                this.indexLoading.set(false);
            }
        });
    }

    refreshRuntime(): void {
        const ws = this.workspace();
        if (!ws) return;

        this.workspaceService.refreshRuntime(ws.id).subscribe({
            next: (runtime) => {
                this.workspace.set({ ...ws, runtime });
                this.snackBar.open('Runtime refreshed', 'Close', { duration: 2000 });
            },
            error: (err) => {
                this.snackBar.open(`Failed to refresh: ${err.message}`, 'Close', {
                    duration: 5000
                });
            }
        });
    }

    refreshIndex(): void {
        const ws = this.workspace();
        if (!ws) return;

        this.indexLoading.set(true);
        this.workspaceService.refreshIndex(ws.id).subscribe({
            next: (data) => {
                this.index.set(data);
                this.indexLoading.set(false);
                this.snackBar.open('Index refreshed', 'Close', { duration: 2000 });
            },
            error: (err) => {
                this.indexLoading.set(false);
                this.snackBar.open(`Failed to refresh index: ${err.message}`, 'Close', {
                    duration: 5000
                });
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/']);
    }

    getFileIcon(type: string): string {
        return type === 'directory' ? 'folder' : 'description';
    }
}
