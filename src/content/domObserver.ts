import { ChatParser, type ChatSection } from './parser';

export class DomObserver {
    private observer: MutationObserver;
    private parser: ChatParser;
    private onUpdate: (sections: ChatSection[]) => void;
    private timeoutId: any = null;

    constructor(onUpdate: (sections: ChatSection[]) => void) {
        this.parser = new ChatParser();
        this.onUpdate = onUpdate;
        this.observer = new MutationObserver(this.handleMutations.bind(this));
    }

    start() {
        // Observe the body or a specific container
        // For MVP, we observe body and look for .chat-container
        const target = document.body;
        this.observer.observe(target, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Initial parse
        this.parse();
    }

    stop() {
        this.observer.disconnect();
    }

    private handleMutations() {
        // Debounce updates
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
            this.parse();
        }, 500);
    }

    private parse() {
        // We pass the body to the parser, and let the strategy decide what to look for
        const sections = this.parser.parse(document.body);
        this.onUpdate(sections);
    }
}
