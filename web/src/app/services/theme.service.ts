import { effect, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly STORAGE_KEY = 'assistant-theme';

    isDark = signal(false);

    constructor() {
        this.loadTheme();

        // React to theme changes and apply to DOM
        effect(() => {
            this.applyTheme(this.isDark());
        });
    }

    toggle(): void {
        this.isDark.set(!this.isDark());
        this.saveTheme();
    }

    setTheme(dark: boolean): void {
        this.isDark.set(dark);
        this.saveTheme();
    }

    private loadTheme(): void {
        const stored = localStorage.getItem(this.STORAGE_KEY);

        if (stored) {
            this.isDark.set(stored === 'dark');
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.isDark.set(prefersDark);
        }
    }

    private saveTheme(): void {
        localStorage.setItem(this.STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    }

    private applyTheme(dark: boolean): void {
        if (dark) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }
}
