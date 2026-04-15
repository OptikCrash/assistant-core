import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';

/**
 * Common Octicon mappings for git operations
 */
export const OCTICONS = {
    // Branch & Commits
    branch: 'octicon:git-branch-16',
    commit: 'octicon:git-commit-16',
    merge: 'octicon:git-merge-16',
    pullRequest: 'octicon:git-pull-request-16',
    compare: 'octicon:git-compare-16',

    // Diff & Changes
    diff: 'octicon:diff-16',
    diffAdded: 'octicon:diff-added-16',
    diffRemoved: 'octicon:diff-removed-16',
    diffModified: 'octicon:diff-modified-16',
    diffRenamed: 'octicon:diff-renamed-16',
    diffIgnored: 'octicon:diff-ignored-16',

    // File States
    fileAdded: 'octicon:file-added-16',
    fileRemoved: 'octicon:file-removed-16',
    fileMoved: 'octicon:file-moved-16',
    file: 'octicon:file-16',
    fileCode: 'octicon:file-code-16',

    // Status
    check: 'octicon:check-16',
    checkCircle: 'octicon:check-circle-16',
    checkCircleFill: 'octicon:check-circle-fill-16',
    x: 'octicon:x-16',
    xCircle: 'octicon:x-circle-16',
    xCircleFill: 'octicon:x-circle-fill-16',
    dot: 'octicon:dot-16',
    dotFill: 'octicon:dot-fill-16',
    alert: 'octicon:alert-16',
    alertFill: 'octicon:alert-fill-16',

    // Arrows
    arrowUp: 'octicon:arrow-up-16',
    arrowDown: 'octicon:arrow-down-16',
    arrowBoth: 'octicon:arrow-both-16',
    sync: 'octicon:sync-16',
    upload: 'octicon:upload-16',
    download: 'octicon:download-16',

    // Repository
    repo: 'octicon:repo-16',
    repoForked: 'octicon:repo-forked-16',
    repoPush: 'octicon:repo-push-16',
    repoPull: 'octicon:repo-pull-16',

    // Misc
    clock: 'octicon:clock-16',
    history: 'octicon:history-16',
    tag: 'octicon:tag-16',
    pencil: 'octicon:pencil-16',
    plus: 'octicon:plus-16',
    plusCircle: 'octicon:plus-circle-16',
} as const;

@Component({
    selector: 'app-octicon',
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `
        <iconify-icon
            [icon]="icon"
            [style.font-size]="size + 'px'"
            [style.color]="color"
            [style.vertical-align]="'middle'"
        ></iconify-icon>
    `,
    styles: [`
        :host {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
    `]
})
export class OcticonComponent {
    @Input({ required: true }) icon!: string;
    @Input() size: number = 16;
    @Input() color?: string;
}
