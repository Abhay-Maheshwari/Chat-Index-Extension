export interface Highlight {
    id: string;
    text: string;
    context: {
        pre: string;
        post: string;
    };
    color: string;
    createdAt: number;
    url: string;
}

export class Highlighter {
    private highlights: Highlight[] = [];
    private tooltip: HTMLElement;

    constructor() {
        this.tooltip = this.createTooltip();
        document.body.appendChild(this.tooltip);
        this.initListeners();
        this.loadHighlights();
    }

    private createTooltip(): HTMLElement {
        const el = document.createElement('div');
        el.className = 'chat-indexer-tooltip';
        el.textContent = 'Highlight';
        el.style.position = 'absolute';
        el.style.display = 'none';
        el.style.background = '#333';
        el.style.color = '#fff';
        el.style.padding = '4px 8px';
        el.style.borderRadius = '4px';
        el.style.cursor = 'pointer';
        el.style.zIndex = '10000';
        el.style.fontSize = '12px';

        el.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent losing selection
            this.createHighlight();
        });

        return el;
    }

    private initListeners() {
        document.addEventListener('mouseup', () => this.handleSelection());
        document.addEventListener('mousedown', (e) => {
            if (e.target !== this.tooltip) {
                this.hideTooltip();
            }
        });
    }

    private handleSelection() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            this.hideTooltip();
            return;
        }

        const text = selection.toString().trim();
        if (text.length < 3) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        this.showTooltip(rect.left + window.scrollX, rect.top + window.scrollY - 30);
    }

    private showTooltip(x: number, y: number) {
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
        this.tooltip.style.display = 'block';
    }

    private hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    private async createHighlight() {
        const selection = window.getSelection();
        if (!selection) return;

        const text = selection.toString();
        const range = selection.getRangeAt(0);

        // Get context (simple implementation)
        const pre = range.startContainer.textContent?.substring(Math.max(0, range.startOffset - 20), range.startOffset) || '';
        const post = range.endContainer.textContent?.substring(range.endOffset, Math.min(range.endContainer.textContent.length, range.endOffset + 20)) || '';

        const highlight: Highlight = {
            id: crypto.randomUUID(),
            text,
            context: { pre, post },
            color: '#ffff00',
            createdAt: Date.now(),
            url: window.location.href
        };

        this.highlights.push(highlight);
        await this.saveHighlights();
        this.renderHighlight(highlight, range);
        this.hideTooltip();
        selection.removeAllRanges();
    }

    private async loadHighlights() {
        const result = await chrome.storage.local.get(['chatHighlights']);
        if (result.chatHighlights) {
            const highlights = result.chatHighlights as Highlight[];
            this.highlights = highlights.filter((h: Highlight) => h.url === window.location.href);
            this.applyHighlights();
        }
    }

    private async saveHighlights() {
        // We need to get all highlights, not just for this page, to avoid overwriting
        const result = await chrome.storage.local.get(['chatHighlights']);
        let allHighlights = (result.chatHighlights as Highlight[]) || [];
        // Remove old highlights for this page
        allHighlights = allHighlights.filter((h: Highlight) => h.url !== window.location.href);
        // Add current highlights
        allHighlights = [...allHighlights, ...this.highlights];

        await chrome.storage.local.set({ chatHighlights: allHighlights });
    }

    private applyHighlights() {
        // Simple text search and replace (MVP)
        // In a real app, this needs to be much more robust (TreeWalker, etc.)
        // For MVP, we'll just try to find the text in the chat container
        // const container = document.querySelector('.chat-container') || document.body;

        this.highlights.forEach(h => {
            // TODO: Implement robust re-highlighting
            console.log('Loaded highlight:', h);
        });
    }

    private renderHighlight(h: Highlight, range: Range) {
        const span = document.createElement('span');
        span.style.backgroundColor = h.color;
        span.style.color = '#000';
        span.className = 'chat-indexer-highlight';
        span.dataset.id = h.id;
        try {
            range.surroundContents(span);
        } catch (e) {
            console.error('Failed to wrap highlight (likely crosses block boundaries)', e);
        }
    }
}
