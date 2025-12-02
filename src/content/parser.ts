export type ContentType = 'text' | 'heading' | 'code' | 'list';

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
    element: HTMLElement;
    heading?: string;
    // Enhanced fields for structured content
    contentType?: ContentType;
    headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
    language?: string; // For code blocks
    children?: ChatMessage[]; // For hierarchical structure
    parentId?: string; // Reference to parent message
    depth?: number; // Depth in hierarchy for indentation
}

export interface ChatSection {
    id: string;
    title: string;
    messages: ChatMessage[];
}

export interface ParserStrategy {
    name: string;
    canHandle(hostname: string): boolean;
    parse(root: HTMLElement): ChatSection[];
}

export class MockParserStrategy implements ParserStrategy {
    name = 'MockParser';

    canHandle(hostname: string): boolean {
        return hostname === 'localhost' || hostname === '127.0.0.1';
    }

    parse(root: HTMLElement): ChatSection[] {
        const container = root.querySelector('.chat-container');
        if (!container) return [];

        const sections: ChatSection[] = [];
        let currentSection: ChatSection = {
            id: 'default',
            title: 'Conversation',
            messages: []
        };
        sections.push(currentSection);

        const messages = container.querySelectorAll('.message');

        messages.forEach((msgElement, index) => {
            const element = msgElement as HTMLElement;
            const role = element.classList.contains('user') ? 'user' : 'ai';
            const id = `msg-${index}`;

            // For AI messages, extract structured content
            if (role === 'ai') {
                const structuredMessages = this.extractStructuredContent(element, id);

                // If we found headings, create sections
                const topLevelHeading = structuredMessages.find(m => m.contentType === 'heading' && m.headingLevel === 1);
                if (topLevelHeading) {
                    currentSection = {
                        id: `section-${index}`,
                        title: topLevelHeading.text,
                        messages: []
                    };
                    sections.push(currentSection);
                }

                // Add all structured messages
                structuredMessages.forEach(msg => {
                    currentSection.messages.push(msg);
                });
            } else {
                // User messages are simple
                const text = element.textContent || '';
                const message: ChatMessage = {
                    id,
                    role,
                    text,
                    element,
                    contentType: 'text'
                };
                element.setAttribute('data-chat-index-id', id);
                currentSection.messages.push(message);
            }
        });

        return sections.filter(s => s.messages.length > 0);
    }

    private extractStructuredContent(element: HTMLElement, baseId: string): ChatMessage[] {
        const messages: ChatMessage[] = [];
        let itemIndex = 0;

        // Extract all structured content in document order
        // This ensures headings and code blocks are interleaved correctly
        const elements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, code');
        console.log(`Chat Indexer Debug: Found ${elements.length} elements in message ${baseId}`);

        elements.forEach((el) => {
            const tagName = el.tagName.toLowerCase();
            const element = el as HTMLElement;

            // Handle Headings
            if (tagName.startsWith('h')) {
                const level = parseInt(tagName.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6;
                const text = element.textContent || '';
                const id = `${baseId}-h${level}-${itemIndex++}`;

                element.setAttribute('data-chat-index-id', id);

                messages.push({
                    id,
                    role: 'ai',
                    text,
                    element,
                    heading: text,
                    contentType: 'heading',
                    headingLevel: level
                });
            }
            // Handle Code Blocks
            else if (tagName === 'code') {
                // Only process code blocks inside PRE
                if (element.parentElement?.tagName !== 'PRE') return;

                const text = element.textContent || '';
                if (text.length < 10) return; // Skip very short code snippets

                const id = `${baseId}-code-${itemIndex++}`;
                const language = this.detectLanguage(element);

                element.setAttribute('data-chat-index-id', id);

                messages.push({
                    id,
                    role: 'ai',
                    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    element,
                    contentType: 'code',
                    language
                });
            }
        });

        // If no structured content found, add the whole message as text
        if (messages.length === 0) {
            const text = element.textContent || '';
            const id = `${baseId}-text`;
            element.setAttribute('data-chat-index-id', id);
            messages.push({
                id,
                role: 'ai',
                text,
                element,
                contentType: 'text'
            });
        }

        // Build hierarchical structure
        return this.buildHierarchy(messages);
    }

    private buildHierarchy(messages: ChatMessage[]): ChatMessage[] {
        // Calculate depth for each item and keep them in a flat array
        // so they all display in the index
        const stack: { level: number; msg: ChatMessage }[] = [];

        for (const msg of messages) {
            if (msg.contentType === 'heading') {
                const currentLevel = msg.headingLevel || 1;

                // Pop stack until we find a parent with lower level
                while (stack.length > 0 && stack[stack.length - 1].level >= currentLevel) {
                    stack.pop();
                }

                // Depth is the current stack size
                msg.depth = stack.length;

                // Push current heading onto stack
                stack.push({ level: currentLevel, msg });
            } else {
                // Non-heading items get depth of current heading + 1
                msg.depth = stack.length;
            }
        }

        return messages;
    }

    private detectLanguage(codeElement: HTMLElement): string {
        // Check for language class (common in syntax highlighters)
        const classes = codeElement.className.split(' ');
        for (const cls of classes) {
            if (cls.startsWith('language-')) {
                return cls.replace('language-', '');
            }
            if (cls.startsWith('lang-')) {
                return cls.replace('lang-', '');
            }
        }
        return 'code';
    }
}

export class ChatGPTParserStrategy implements ParserStrategy {
    name = 'ChatGPTParser';

    canHandle(hostname: string): boolean {
        return hostname.includes('chatgpt.com') || hostname.includes('openai.com');
    }

    parse(root: HTMLElement): ChatSection[] {
        const sections: ChatSection[] = [];
        let currentSection: ChatSection = {
            id: 'default',
            title: 'Conversation',
            messages: []
        };
        sections.push(currentSection);

        // Strategy 1: Look for 'article' tags (standard ChatGPT message blocks)
        let messageElements = root.querySelectorAll('article');

        // Strategy 2: If no articles, look for data-message-author-role
        if (messageElements.length === 0) {
            messageElements = root.querySelectorAll('[data-message-author-role]');
        }

        if (messageElements.length === 0) {
            return [];
        }

        messageElements.forEach((element, index) => {
            const el = element as HTMLElement;

            // Try to determine role
            let role: 'user' | 'ai' = 'ai';
            if (el.querySelector('[data-message-author-role="user"]')) {
                role = 'user';
            } else if (el.getAttribute('data-message-author-role') === 'user') {
                role = 'user';
            }

            const id = `gpt-msg-${index}`;

            // For AI messages, extract structured content
            if (role === 'ai') {
                const textContainer = el.querySelector('.markdown') || el.querySelector('.whitespace-pre-wrap') || el;
                const structuredMessages = this.extractStructuredContent(textContainer as HTMLElement, id);

                // If we found headings, create sections
                const topLevelHeading = structuredMessages.find(m => m.contentType === 'heading' && m.headingLevel === 1);
                if (topLevelHeading) {
                    currentSection = {
                        id: `section-${index}`,
                        title: topLevelHeading.text,
                        messages: []
                    };
                    sections.push(currentSection);
                }

                // Add all structured messages
                structuredMessages.forEach(msg => {
                    currentSection.messages.push(msg);
                });
            } else {
                // User messages are simple
                const textContainer = el.querySelector('.markdown') || el.querySelector('.whitespace-pre-wrap') || el;
                const text = textContainer.textContent || '';

                const message: ChatMessage = {
                    id,
                    role,
                    text,
                    element: el,
                    contentType: 'text'
                };

                if (!el.hasAttribute('data-chat-index-id')) {
                    el.setAttribute('data-chat-index-id', id);
                }

                currentSection.messages.push(message);
            }
        });

        return sections.filter(s => s.messages.length > 0);
    }

    private extractStructuredContent(element: HTMLElement, baseId: string): ChatMessage[] {
        const messages: ChatMessage[] = [];
        let itemIndex = 0;

        // Extract all headings (h1-h6)
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((heading) => {
            const headingEl = heading as HTMLElement;
            const level = parseInt(heading.tagName.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6;
            const text = headingEl.textContent || '';
            const id = `${baseId}-h${level}-${itemIndex++}`;

            headingEl.setAttribute('data-chat-index-id', id);

            messages.push({
                id,
                role: 'ai',
                text,
                element: headingEl,
                heading: text,
                contentType: 'heading',
                headingLevel: level
            });
        });

        // Extract code blocks
        const codeBlocks = element.querySelectorAll('pre code, code');
        codeBlocks.forEach((codeEl) => {
            const code = codeEl as HTMLElement;
            // Skip inline code (only index code blocks in <pre>)
            if (code.tagName === 'CODE' && code.parentElement?.tagName !== 'PRE') {
                return;
            }

            const text = code.textContent || '';
            if (text.length < 10) return; // Skip very short code snippets

            const id = `${baseId}-code-${itemIndex++}`;
            const language = this.detectLanguage(code);

            code.setAttribute('data-chat-index-id', id);

            messages.push({
                id,
                role: 'ai',
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                element: code,
                contentType: 'code',
                language
            });
        });

        // If no structured content found, add the whole message as text
        if (messages.length === 0) {
            const text = element.textContent || '';
            const id = `${baseId}-text`;
            element.setAttribute('data-chat-index-id', id);
            messages.push({
                id,
                role: 'ai',
                text,
                element,
                contentType: 'text'
            });
        }

        // Build hierarchical structure
        return this.buildHierarchy(messages);
    }

    private buildHierarchy(messages: ChatMessage[]): ChatMessage[] {
        // Calculate depth for each item and keep them in a flat array
        // so they all display in the index
        const stack: { level: number; msg: ChatMessage }[] = [];

        for (const msg of messages) {
            if (msg.contentType === 'heading') {
                const currentLevel = msg.headingLevel || 1;

                // Pop stack until we find a parent with lower level
                while (stack.length > 0 && stack[stack.length - 1].level >= currentLevel) {
                    stack.pop();
                }

                // Depth is the current stack size
                msg.depth = stack.length;

                // Push current heading onto stack
                stack.push({ level: currentLevel, msg });
            } else {
                // Non-heading items get depth of current heading + 1
                msg.depth = stack.length;
            }
        }

        return messages;
    }

    private detectLanguage(codeElement: HTMLElement): string {
        // Check for language class (common in syntax highlighters)
        const classes = codeElement.className.split(' ');
        for (const cls of classes) {
            if (cls.startsWith('language-')) {
                return cls.replace('language-', '');
            }
            if (cls.startsWith('lang-')) {
                return cls.replace('lang-', '');
            }
        }
        return 'code';
    }
}

export class ChatParser {
    private strategies: ParserStrategy[];
    private activeStrategy: ParserStrategy | null = null;

    constructor() {
        this.strategies = [
            new MockParserStrategy(),
            new ChatGPTParserStrategy()
        ];
        this.selectStrategy();
    }

    private selectStrategy() {
        const hostname = window.location.hostname;
        this.activeStrategy = this.strategies.find(s => s.canHandle(hostname)) || null;
        if (this.activeStrategy) {
            console.log(`Chat Indexer: Selected strategy ${this.activeStrategy.name}`);
        } else {
            console.log('Chat Indexer: No matching strategy found for', hostname);
        }
    }

    parse(root: HTMLElement): ChatSection[] {
        if (!this.activeStrategy) {
            // Try to select again in case URL changed (SPA navigation)
            this.selectStrategy();
        }

        if (this.activeStrategy) {
            return this.activeStrategy.parse(root);
        }
        return [];
    }
}
