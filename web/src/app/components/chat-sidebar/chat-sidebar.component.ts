import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatSidebarService } from '../../services/chat-sidebar.service';
import {
    ChatMessage,
    ChatService,
    PlanResponse,
    RiskLevel
} from '../../services/chat.service';
import { WorkspaceContext, WorkspaceService } from '../../services/workspace.service';

@Component({
    selector: 'app-chat-sidebar',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatSnackBarModule,
        MatTooltipModule
    ],
    templateUrl: './chat-sidebar.component.html',
    styleUrls: ['./chat-sidebar.component.scss']
})
export class ChatSidebarComponent {
    private chatService = inject(ChatService);
    private workspaceService = inject(WorkspaceService);
    private snackBar = inject(MatSnackBar);

    sidebarService = inject(ChatSidebarService);

    @ViewChild('messagesContainer') messagesContainer!: ElementRef;
    @ViewChild('messageInput') messageInput!: ElementRef;

    workspaces = signal<WorkspaceContext[]>([]);
    messageText = '';
    sending = signal(false);
    executing = signal(false);

    // Resize state
    isResizing = signal(false);
    private startX = 0;
    private startWidth = 0;

    constructor() {
        this.loadWorkspaces();
    }

    loadWorkspaces(): void {
        this.workspaceService.getWorkspaces().subscribe({
            next: (list) => {
                this.workspaces.set(list);
                // Auto-select first workspace if none selected
                if (!this.sidebarService.selectedWorkspaceId() && list.length > 0) {
                    this.sidebarService.selectWorkspace(list[0].id, list[0].rootPath);
                }
            }
        });
    }

    onWorkspaceChange(workspaceId: string): void {
        const ws = this.workspaces().find(w => w.id === workspaceId);
        if (ws) {
            this.sidebarService.selectWorkspace(ws.id, ws.rootPath);
        }
    }

    async sendMessage(): Promise<void> {
        const text = this.messageText.trim();
        if (!text || this.sending()) return;

        const chat = this.sidebarService.currentChat();
        if (!chat) {
            this.snackBar.open('Please select a workspace first', 'Close', { duration: 3000 });
            return;
        }

        // Add user message
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };
        this.sidebarService.addMessage(userMessage);
        this.messageText = '';
        this.scrollToBottom();

        // Send to backend
        this.sending.set(true);
        this.chatService.createPlan({
            message: text,
            workspacePath: chat.workspacePath
        }).subscribe({
            next: (response) => {
                // Add plan message
                const planMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'plan',
                    content: response.plan.intent,
                    timestamp: new Date(),
                    plan: response
                };
                this.sidebarService.addMessage(planMessage);
                this.sidebarService.setPendingPlan(response);
                this.sending.set(false);
                this.scrollToBottom();
            },
            error: (err) => {
                this.snackBar.open(`Failed to create plan: ${err.message}`, 'Close', {
                    duration: 5000
                });
                this.sending.set(false);
            }
        });
    }

    executePlan(plan: PlanResponse, confirm: boolean): void {
        if (this.executing()) return;

        this.executing.set(true);
        this.chatService.executePlan({
            planId: plan.planId,
            confirmRisk: confirm
        }).subscribe({
            next: (response) => {
                // Add execution result message
                const execMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'execution',
                    content: response.status === 'COMPLETED'
                        ? 'Plan executed successfully'
                        : 'Plan execution failed',
                    timestamp: new Date(),
                    execution: response
                };
                this.sidebarService.addMessage(execMessage);
                this.sidebarService.clearPendingPlan();
                this.executing.set(false);
                this.scrollToBottom();

                if (response.status === 'COMPLETED') {
                    this.snackBar.open('Plan executed successfully', 'Close', { duration: 3000 });
                } else {
                    this.snackBar.open('Plan execution failed', 'Close', { duration: 5000 });
                }
            },
            error: (err) => {
                this.snackBar.open(`Execution failed: ${err.error?.error || err.message}`, 'Close', {
                    duration: 5000
                });
                this.executing.set(false);
            }
        });
    }

    rejectPlan(): void {
        this.sidebarService.clearPendingPlan();

        const message: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Plan rejected. Feel free to ask me something else.',
            timestamp: new Date()
        };
        this.sidebarService.addMessage(message);
        this.scrollToBottom();
    }

    clearChat(): void {
        this.sidebarService.clearChat();
    }

    getRiskColor(risk: RiskLevel): string {
        switch (risk) {
            case 'LOW': return 'primary';
            case 'MEDIUM': return 'accent';
            case 'HIGH': return 'warn';
            case 'CRITICAL': return 'warn';
            default: return '';
        }
    }

    getRiskIcon(risk: RiskLevel): string {
        switch (risk) {
            case 'LOW': return 'check_circle';
            case 'MEDIUM': return 'info';
            case 'HIGH': return 'warning';
            case 'CRITICAL': return 'dangerous';
            default: return 'help';
        }
    }

    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    // Resize handlers
    startResize(event: MouseEvent): void {
        this.isResizing.set(true);
        this.startX = event.clientX;
        this.startWidth = this.sidebarService.width();

        document.addEventListener('mousemove', this.onResize);
        document.addEventListener('mouseup', this.stopResize);
        event.preventDefault();
    }

    private onResize = (event: MouseEvent): void => {
        if (!this.isResizing()) return;
        const delta = this.startX - event.clientX;
        this.sidebarService.setWidth(this.startWidth + delta);
    };

    private stopResize = (): void => {
        this.isResizing.set(false);
        document.removeEventListener('mousemove', this.onResize);
        document.removeEventListener('mouseup', this.stopResize);
    };

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.messagesContainer) {
                const el = this.messagesContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            }
        }, 100);
    }
}
