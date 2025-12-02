// Test script to verify parser logic
const container = document.querySelector('.chat-container');
const messages = container.querySelectorAll('.message');
const aiMessage = messages[1]; // The Module 1 message

console.log('Testing extraction on:', aiMessage);

// 1. Test headings extraction
const headings = aiMessage.querySelectorAll('h1, h2, h3, h4, h5, h6');
console.log('Headings found:', headings.length);
headings.forEach(h => console.log(h.tagName, h.textContent));

// 2. Test code blocks extraction
const codeBlocks = aiMessage.querySelectorAll('pre code, code');
console.log('Code blocks found:', codeBlocks.length);

// 3. Test full logic
const extractedMessages = [];
let itemIndex = 0;
const baseId = 'test';

headings.forEach((heading) => {
    const level = parseInt(heading.tagName.substring(1));
    const text = heading.textContent || '';
    const id = `${baseId}-h${level}-${itemIndex++}`;
    extractedMessages.push({ id, text, level, type: 'heading' });
});

codeBlocks.forEach((code) => {
    if (code.tagName === 'CODE' && code.parentElement?.tagName !== 'PRE') return;
    const text = code.textContent || '';
    const id = `${baseId}-code-${itemIndex++}`;
    extractedMessages.push({ id, text: text.substring(0, 20), type: 'code' });
});

console.log('Total extracted:', extractedMessages.length);
console.log(extractedMessages);
