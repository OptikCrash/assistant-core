import { Component, Input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getTechIcon, hasTechIcon } from '../../pipes/tech-icon.pipe';

@Component({
    selector: 'app-tech-badge',
    standalone: true,
    imports: [MatTooltipModule],
    template: `
        @if (hasIcon) {
            <span class="tech-badge" [matTooltip]="tech">
                <i [class]="iconClass"></i>
            </span>
        } @else {
            <span class="tech-badge text-only" [matTooltip]="tech">
                {{ shortLabel }}
            </span>
        }
    `,
    styles: [`
        .tech-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            background: var(--bg-hover);
            transition: transform 0.2s, background 0.2s;
            cursor: default;

            &:hover {
                transform: scale(1.1);
                background: var(--bg-card);
            }

            i {
                font-size: 20px;

                // Fix Angular icon color (devicon colored variant has issues)
                &.devicon-angular-plain {
                    color: #DD0031;
                }
            }

            &.text-only {
                width: auto;
                min-width: 32px;
                padding: 0 8px;
                font-size: 11px;
                font-weight: 500;
                color: var(--text-secondary);
                text-transform: uppercase;
            }
        }
    `]
})
export class TechBadgeComponent {
    @Input({ required: true }) tech!: string;

    get hasIcon(): boolean {
        return hasTechIcon(this.tech);
    }

    get iconClass(): string {
        return getTechIcon(this.tech);
    }

    get shortLabel(): string {
        // Return first 3-4 chars as abbreviation
        return this.tech.slice(0, 4);
    }
}
