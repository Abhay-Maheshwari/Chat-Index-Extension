import { useEffect, useState } from 'react'
import { HighlightsList } from './components/HighlightsList'
import './index.css'
import './search.css'
import './highlights.css'

type ContentType = 'text' | 'heading' | 'code' | 'list';

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
    heading?: string;
    contentType?: ContentType;
    headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
    language?: string;
    children?: ChatMessage[];
    parentId?: string;
    depth?: number;
}

interface ChatSection {
    id: string;
    title: string;
    messages: ChatMessage[];
}

interface Highlight {
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

// Component to render individual message item
interface MessageItemProps {
    msg: ChatMessage;
    onJump: (id: string) => void;
    onToggle: (id: string) => void;
    isCollapsed: boolean;
    hasChildren: boolean;
}

const MessageItem = ({ msg, onJump, onToggle, isCollapsed, hasChildren }: MessageItemProps) => {
    const indentLevel = msg.depth || 0;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(msg.id);
    };

    // Determine specific class for styling based on content type and level
    let contentClass = 'text-default';
    if (msg.contentType === 'heading') {
        contentClass = `text-heading h${msg.headingLevel || 1}`;
    } else if (msg.contentType === 'code') {
        contentClass = 'text-code';
    }

    return (
        <div
            className={`index-item ${msg.role}`}
            style={{ paddingLeft: `${indentLevel * 12 + 12}px` }}
            onClick={() => onJump(msg.id)}
            title={msg.text}
        >
            <div className="item-content">
                {hasChildren ? (
                    <span
                        className={`collapse-icon ${isCollapsed ? 'collapsed' : ''}`}
                        onClick={handleToggle}
                    >
                        ▼
                    </span>
                ) : (
                    <span className="collapse-placeholder"></span>
                )}

                <span className={`text-preview ${contentClass}`}>
                    {msg.heading || msg.text}
                </span>
            </div>
        </div>
    );
};

function App() {
    const [activeTab, setActiveTab] = useState<'index' | 'highlights'>('index');
    const [sections, setSections] = useState<ChatSection[]>([]);
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

    const toggleCollapse = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Function to determine if a message has children (i.e., is a parent of collapsed items)
    const hasChildren = (allMessages: ChatMessage[], index: number): boolean => {
        const currentMessage = allMessages[index];
        if (!currentMessage) return false;

        // A message has children if the next message has a greater depth
        // and is not a child of another collapsed parent.
        for (let i = index + 1; i < allMessages.length; i++) {
            const nextMessage = allMessages[i];
            if (nextMessage.depth && nextMessage.depth > currentMessage.depth!) {
                return true;
            }
            // If we encounter a message at the same or shallower depth, it's not a child
            if (nextMessage.depth && nextMessage.depth <= currentMessage.depth!) {
                break;
            }
        }
        return false;
    };

    // Function to get messages visible after collapse logic
    const getVisibleMessages = (allMessages: ChatMessage[]): ChatMessage[] => {
        const visible: ChatMessage[] = [];
        let skipUntilDepth: number | null = null;

        for (let i = 0; i < allMessages.length; i++) {
            const msg = allMessages[i];

            if (skipUntilDepth !== null) {
                if (msg.depth && msg.depth > skipUntilDepth) {
                    continue; // Skip this message as it's a child of a collapsed parent
                } else {
                    skipUntilDepth = null; // Reset skip if we're at or above the skip depth
                }
            }

            visible.push(msg);

            if (collapsedIds.has(msg.id)) {
                skipUntilDepth = msg.depth || 0;
            }
        }
        return visible;
    };

    const handleJump = (id: string | undefined) => {
        if (id) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'scroll_to', id });
                }
            });
        }
    };

    const checkConnection = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
                    if (chrome.runtime.lastError || !response || response.status !== 'pong') {
                        setConnectionStatus('disconnected');
                    } else {
                        setConnectionStatus('connected');
                    }
                });
            } else {
                setConnectionStatus('disconnected');
            }
        });
    };

    useEffect(() => {
        // Initial load
        chrome.storage.local.get(['chatIndex', 'chatHighlights'], (result) => {
            if (result.chatIndex) {
                setSections(result.chatIndex as ChatSection[]);
            }
            if (result.chatHighlights) {
                setHighlights(result.chatHighlights as Highlight[]);
            }
        });

        // Listen for updates
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local') {
                if (changes.chatIndex) {
                    const newSections = changes.chatIndex.newValue as ChatSection[];
                    setSections(newSections);
                    // If we are getting data, we are connected
                    if (newSections && newSections.length > 0) {
                        setConnectionStatus('connected');
                    }
                }
                if (changes.chatHighlights) {
                    setHighlights(changes.chatHighlights.newValue as Highlight[]);
                }
            }
        };
        chrome.storage.onChanged.addListener(listener);

        // Check connection initially and every few seconds
        checkConnection();
        const interval = setInterval(checkConnection, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setConnectionStatus('connecting');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'refresh_index' }, () => {
                    // After triggering refresh, check connection and data again
                    setTimeout(() => {
                        checkConnection();
                        chrome.storage.local.get(['chatIndex', 'chatHighlights'], (result) => {
                            if (result.chatIndex) setSections(result.chatIndex as ChatSection[]);
                            if (result.chatHighlights) setHighlights(result.chatHighlights as Highlight[]);
                        });
                    }, 500);
                });
            }
        });
    };

    const filteredSections = sections.map(section => {
        // First filter by search
        const searchFiltered = section.messages.filter(msg =>
            msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (msg.heading && msg.heading.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        // Then apply collapse logic only if no search query (expand all on search)
        const finalMessages = searchQuery ? searchFiltered : getVisibleMessages(searchFiltered);

        return {
            ...section,
            messages: finalMessages
        };
    }).filter(section => section.messages.length > 0 || section.title.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filter highlights for current page (mock implementation for now, assuming all are for current page)
    // In real app we would filter by URL
    const currentHighlights = highlights;

    return (
        <div className="App">
            <header>
                <div className="header-top">
                    <h2>Chat Index</h2>
                    <div className="header-actions">
                        <button
                            className="icon-button"
                            onClick={handleRefresh}
                            title="Refresh Index"
                        >
                            ↻
                        </button>
                        <button
                            className="icon-button"
                            onClick={() => {
                                const allParentIds = new Set<string>();
                                sections.forEach(section => {
                                    section.messages.forEach((msg, idx) => {
                                        if (hasChildren(section.messages, idx)) {
                                            allParentIds.add(msg.id);
                                        }
                                    });
                                });
                                setCollapsedIds(allParentIds);
                            }}
                            title="Collapse All"
                        >
                            −
                        </button>
                    </div>
                </div>
                <div className="tabs">
                    <button
                        className={activeTab === 'index' ? 'active' : ''}
                        onClick={() => setActiveTab('index')}
                    >
                        Index
                    </button>
                    <button
                        className={activeTab === 'highlights' ? 'active' : ''}
                        onClick={() => setActiveTab('highlights')}
                    >
                        Highlights
                    </button>
                </div>
                {activeTab === 'index' && (
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                )}
            </header>

            {connectionStatus === 'disconnected' && (
                <div className="status-bar disconnected">
                    ⚠️ No chat detected. Refresh or navigate to a chat page.
                </div>
            )}

            <div className="content-area">
                {activeTab === 'index' ? (
                    <div className="index-container">
                        {filteredSections.length === 0 ? (
                            <p className="empty-state">No results found.</p>
                        ) : (
                            filteredSections.map(section => (
                                <div key={section.id} className="section">
                                    {section.title !== 'Conversation' && (
                                        <div className="section-title" onClick={() => handleJump(section.messages[0]?.id)}>
                                            {section.title}
                                        </div>
                                    )}
                                    <div className="messages">
                                        {section.messages.map((msg) => {
                                            // Find original index to check for children correctly
                                            // This is a bit expensive but accurate. 
                                            // Optimization: Pre-calculate hasChildren map
                                            const originalIdx = sections.find(s => s.id === section.id)?.messages.findIndex(m => m.id === msg.id) ?? -1;
                                            const originalMessages = sections.find(s => s.id === section.id)?.messages || [];
                                            const itemHasChildren = hasChildren(originalMessages, originalIdx);

                                            return (
                                                <MessageItem
                                                    key={msg.id}
                                                    msg={msg}
                                                    onJump={handleJump}
                                                    onToggle={toggleCollapse}
                                                    isCollapsed={collapsedIds.has(msg.id)}
                                                    hasChildren={itemHasChildren}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <HighlightsList highlights={currentHighlights} onJump={handleJump} />
                )}
            </div>
        </div>
    )
}

export default App
