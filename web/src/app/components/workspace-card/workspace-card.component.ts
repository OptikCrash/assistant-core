import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkspaceContext } from '../../services/workspace.service';
import { OcticonComponent, OCTICONS } from '../octicon/octicon.component';
import { TechBadgeComponent } from '../tech-badge/tech-badge.component';

@Component({
    selector: 'app-workspace-card',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        TechBadgeComponent,
        OcticonComponent
    ],
    templateUrl: './workspace-card.component.html',
    styleUrls: ['./workspace-card.component.scss']
})
export class WorkspaceCardComponent {
    workspace = input.required<WorkspaceContext>();
    icons = OCTICONS;

    refreshRuntime = output<string>();
    viewDetails = output<string>();
    deleteWorkspace = output<string>();

    get branchStatusColor(): string {
        return this.workspace().runtime?.dirty ? '#ff9800' : '#4caf50';
    }

    get syncStatus(): string {
        const runtime = this.workspace().runtime;
        if (!runtime) return '';

        const parts: string[] = [];
        if (runtime.aheadBy && runtime.aheadBy > 0) {
            parts.push(`↑${runtime.aheadBy}`);
        }
        if (runtime.behindBy && runtime.behindBy > 0) {
            parts.push(`↓${runtime.behindBy}`);
        }
        return parts.join(' ');
    }

    onRefresh(): void {
        this.refreshRuntime.emit(this.workspace().id);
    }

    onViewDetails(): void {
        this.viewDetails.emit(this.workspace().id);
    }

    onDelete(): void {
        this.deleteWorkspace.emit(this.workspace().id);
    }
}
