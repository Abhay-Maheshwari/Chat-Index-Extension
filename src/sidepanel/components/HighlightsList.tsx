import React from 'react';

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

interface HighlightsListProps {
    highlights: Highlight[];
    onJump: (id: string) => void;
}

export const HighlightsList: React.FC<HighlightsListProps> = ({ highlights, onJump }) => {
    if (highlights.length === 0) {
        return <p className="empty-state">No highlights yet.</p>;
    }

    return (
        <div className="highlights-list">
            {highlights.map(h => (
                <div key={h.id} className="highlight-item" onClick={() => onJump(h.id)}>
                    <div className="highlight-text" style={{ borderLeft: `3px solid ${h.color}` }}>
                        "{h.text}"
                    </div>
                    <div className="highlight-date">
                        {new Date(h.createdAt).toLocaleTimeString()}
                    </div>
                </div>
            ))}
        </div>
    );
};
