import { DomObserver } from './domObserver';
import type { ChatSection } from './parser';
import { Highlighter } from './highlighter';

console.log('Chat Indexer Content Script Loaded');

// Initialize highlighter with error handling
try {
    new Highlighter();
} catch (e) {
    console.error('Chat Indexer: Failed to initialize highlighter', e);
}

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    try {
        if (request.action === 'get_index') {
            sendResponse({ status: 'ok' });
        }
        if (request.action === 'ping') {
            sendResponse({ status: 'pong' });
        }
        if (request.action === 'scroll_to') {
            const element = document.querySelector(`[data-chat-index-id="${request.id}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        if (request.action === 'refresh_index') {
            // Force a re-parse
            observer.start();
            sendResponse({ status: 'ok' });
        }
    } catch (e) {
        console.error('Chat Indexer: Error handling message', e);
        sendResponse({ status: 'error', error: String(e) });
    }
    return true; // Keep channel open for async response
});

// Initialize Observer
const observer = new DomObserver((sections: ChatSection[]) => {
    console.log('Chat Index Updated:', sections);
    try {
        // We need to strip elements before storing as they are not serializable
        const serializableSections = sections.map(section => ({
            ...section,
            messages: section.messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                text: msg.text && msg.text.length > 50 ? msg.text.substring(0, 50) + '...' : msg.text,
                heading: msg.heading,
                contentType: msg.contentType,
                headingLevel: msg.headingLevel,
                language: msg.language,
                depth: msg.depth
                // omit element, children, parentId
            }))
        }));

        chrome.storage.local.set({ chatIndex: serializableSections });
    } catch (e) {
        console.error('Chat Indexer: Error saving index', e);
    }
});

// Wait for page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => observer.start());
} else {
    observer.start();
}
