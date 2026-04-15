import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ChatSidebarService } from '../../services/chat-sidebar.service';
import { ThemeService } from '../../services/theme.service';
import { WorkspaceService, WorkspaceValidateResult } from '../../services/workspace.service';

@Component({
    selector: 'app-workspace-register',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule
    ],
    templateUrl: './workspace-register.component.html',
    styleUrls: ['./workspace-register.component.scss']
})
export class WorkspaceRegisterComponent {
    private router = inject(Router);
    private workspaceService = inject(WorkspaceService);
    private snackBar = inject(MatSnackBar);
    themeService = inject(ThemeService);
    chatSidebarService = inject(ChatSidebarService);

    workspaceId = '';
    rootPath = '';

    validating = signal(false);
    validation = signal<WorkspaceValidateResult | null>(null);
    registering = signal(false);

    goBack(): void {
        this.router.navigate(['/']);
    }

    validatePath(): void {
        if (!this.rootPath.trim()) {
            this.snackBar.open('Please enter a path', 'Close', { duration: 3000 });
            return;
        }

        this.validating.set(true);
        this.validation.set(null);

        this.workspaceService.validateWorkspace(this.rootPath).subscribe({
            next: (result) => {
                this.validation.set(result);
                this.validating.set(false);

                // Auto-generate ID from path if not set
                if (!this.workspaceId && result.exists) {
                    const parts = this.rootPath.split('/').filter(p => p);
                    this.workspaceId = parts[parts.length - 1] || 'workspace';
                }
            },
            error: (err) => {
                this.validating.set(false);
                this.snackBar.open(`Validation failed: ${err.message}`, 'Close', {
                    duration: 5000
                });
            }
        });
    }

    register(): void {
        if (!this.workspaceId.trim() || !this.rootPath.trim()) {
            this.snackBar.open('Please fill in all fields', 'Close', { duration: 3000 });
            return;
        }

        const v = this.validation();
        if (!v?.exists) {
            this.snackBar.open('Please validate the path first', 'Close', { duration: 3000 });
            return;
        }

        this.registering.set(true);

        this.workspaceService.registerWorkspace(this.workspaceId, this.rootPath).subscribe({
            next: () => {
                this.snackBar.open('Workspace registered successfully!', 'Close', {
                    duration: 3000
                });
                this.router.navigate(['/']);
            },
            error: (err) => {
                this.registering.set(false);
                this.snackBar.open(`Registration failed: ${err.message}`, 'Close', {
                    duration: 5000
                });
            }
        });
    }

    get canRegister(): boolean {
        const v = this.validation();
        return !!(
            this.workspaceId.trim() &&
            this.rootPath.trim() &&
            v?.exists
        );
    }
}
