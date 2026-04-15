import { computed, effect, Injectable, signal } from '@angular/core';
import { ChatMessage, PlanResponse } from './chat.service';

export interface WorkspaceChat {
    workspaceId: string;
    workspacePath: string;
    messages: ChatMessage[];
    pendingPlan?: PlanResponse;
}

@Injectable({
    providedIn: 'root'
})
export class ChatSidebarService {
    private readonly STORAGE_KEY = 'assistant-sidebar';

    // Sidebar state
    isOpen = signal(false);
    width = signal(400);

    // Chat state
    selectedWorkspaceId = signal<string | null>(null);
    workspaceChats = signal<Map<string, WorkspaceChat>>(new Map());

    // Computed
    currentChat = computed(() => {
        const id = this.selectedWorkspaceId();
        if (!id) return null;
        return this.workspaceChats().get(id) ?? null;
    });

    currentMessages = computed(() => {
        return this.currentChat()?.messages ?? [];
    });

    pendingPlan = computed(() => {
        return this.currentChat()?.pendingPlan ?? null;
    });

    constructor() {
        this.loadState();

        // Persist state changes
        effect(() => {
            this.saveState();
        });
    }

    toggle(): void {
        this.isOpen.set(!this.isOpen());
    }

    open(): void {
        this.isOpen.set(true);
    }

    close(): void {
        this.isOpen.set(false);
    }

    setWidth(width: number): void {
        this.width.set(Math.max(300, Math.min(800, width)));
    }

    selectWorkspace(id: string, rootPath: string): void {
        this.selectedWorkspaceId.set(id);

        // Initialize chat for workspace if not exists
        const chats = new Map(this.workspaceChats());
        if (!chats.has(id)) {
            chats.set(id, {
                workspaceId: id,
                workspacePath: rootPath,
                messages: []
            });
            this.workspaceChats.set(chats);
        }
    }

    addMessage(message: ChatMessage): void {
        const id = this.selectedWorkspaceId();
        if (!id) return;

        const chats = new Map(this.workspaceChats());
        const chat = chats.get(id);
        if (chat) {
            chats.set(id, {
                ...chat,
                messages: [...chat.messages, message]
            });
            this.workspaceChats.set(chats);
        }
    }

    setPendingPlan(plan: PlanResponse | undefined): void {
        const id = this.selectedWorkspaceId();
        if (!id) return;

        const chats = new Map(this.workspaceChats());
        const chat = chats.get(id);
        if (chat) {
            chats.set(id, {
                ...chat,
                pendingPlan: plan
            });
            this.workspaceChats.set(chats);
        }
    }

    clearPendingPlan(): void {
        this.setPendingPlan(undefined);
    }

    clearChat(): void {
        const id = this.selectedWorkspaceId();
        if (!id) return;

        const chats = new Map(this.workspaceChats());
        const chat = chats.get(id);
        if (chat) {
            chats.set(id, {
                ...chat,
                messages: [],
                pendingPlan: undefined
            });
            this.workspaceChats.set(chats);
        }
    }

    private loadState(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.isOpen.set(data.isOpen ?? false);
                this.width.set(data.width ?? 400);
                this.selectedWorkspaceId.set(data.selectedWorkspaceId ?? null);

                // Restore workspace chats
                if (data.workspaceChats) {
                    const chats = new Map<string, WorkspaceChat>();
                    for (const [key, value] of Object.entries(data.workspaceChats)) {
                        const chat = value as WorkspaceChat;
                        // Restore Date objects
                        chat.messages = chat.messages.map(m => ({
                            ...m,
                            timestamp: new Date(m.timestamp)
                        }));
                        chats.set(key, chat);
                    }
                    this.workspaceChats.set(chats);
                }
            }
        } catch {
            // Ignore storage errors
        }
    }

    private saveState(): void {
        try {
            const chatsObj: Record<string, WorkspaceChat> = {};
            for (const [key, value] of this.workspaceChats().entries()) {
                chatsObj[key] = value;
            }

            const data = {
                isOpen: this.isOpen(),
                width: this.width(),
                selectedWorkspaceId: this.selectedWorkspaceId(),
                workspaceChats: chatsObj
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch {
            // Ignore storage errors
        }
    }
}
