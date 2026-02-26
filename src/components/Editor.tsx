import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { Autocomplete } from './Autocomplete';


export type BlockType = 'scene_heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition';

export interface Block {
    id: string;
    type: BlockType;
    content: string;
}

export const generateId = () => Math.random().toString(36).substr(2, 9);

interface EditorProps {
    blocks: Block[];
    setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
}

const EditorBlock = ({
    block,
    index,
    onKeyDown,
    onInput,
    onFocus,
    setRef
}: {
    block: Block;
    index: number;
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>, index: number) => void;
    onInput: (text: string, index: number) => void;
    onFocus: (id: string) => void;
    setRef: (id: string, el: HTMLElement | null) => void;
}) => {
    const elRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (elRef.current && elRef.current.textContent !== block.content) {
            elRef.current.textContent = block.content;
        }
    }, [block.content]);

    return (
        <div
            ref={(el) => {
                elRef.current = el;
                setRef(block.id, el);
            }}
            id={`block-${block.id}`}
            className={`editor-block block-${block.type}`}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={block.type.replace('_', ' ').toUpperCase()}
            onKeyDown={(e) => onKeyDown(e, index)}
            onInput={(e) => onInput(e.currentTarget.textContent || '', index)}
            onFocus={() => onFocus(block.id)}
        />
    );
};

export const Editor = ({ blocks, setBlocks }: EditorProps) => {
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({});

    const [shouldFocus, setShouldFocus] = useState(false);

    // --- Autocomplete State ---
    const [acShow, setAcShow] = useState(false);
    const [acOptions, setAcOptions] = useState<string[]>([]);
    const [acAnchorRect, setAcAnchorRect] = useState<{ x: number, y: number, width: number, height: number, top: number, bottom: number, left: number, right: number } | null>(null);
    const [acMatchRange, setAcMatchRange] = useState<{ start: number, end: number } | null>(null);

    // Compute known locations from previous blocks
    const knownLocations = useMemo(() => {
        const locs = new Set<string>();
        blocks.forEach(b => {
            if (b.type === 'scene_heading') {
                const parts = b.content.split('-');
                if (parts[0]) {
                    // Extract just the location part (e.g., "INT. COFFEE SHOP " -> "COFFEE SHOP")
                    const locPart = parts[0].replace(/^(INT\.|EXT\.|INT\.\/EXT\.)\s*/i, '').trim();
                    if (locPart) locs.add(locPart.toUpperCase());
                }
            }
        });
        return Array.from(locs);
    }, [blocks]);

    useEffect(() => {
        if (focusedId && shouldFocus && blockRefs.current[focusedId]) {
            const el = blockRefs.current[focusedId];
            if (el) {
                el.focus();
                if (typeof window.getSelection !== "undefined"
                    && typeof document.createRange !== "undefined") {
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
            }
            setShouldFocus(false);
        }
    }, [focusedId, shouldFocus]);

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
        const block = blocks[index];

        // If autocomplete is open, we might want to let downshift handle up/down/enter
        // Downshift intercepts standard events automatically if focused, but since our
        // contenteditable keeps focus, we rely on Downshift's hooks internally? Actually,
        // Since Downshift is just headless, we need to pass keyboard events down if we were 
        // fully controlling it. However, a simpler Scrite-like approach: 
        // If AC is open, let ArrowUp/Down be handled by Downshift (We would need to wire that).
        // Let's implement a simpler controlled interaction or let the user type.
        // For a full robust integration, we'll keep it simple: if AC is open and they press Enter, 
        // we'll handle it in the AC onSelect. But since we don't have direct ref to Downshift here,
        // we will close it on arbitrary navigation.

        if (acShow && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter')) {
            // Basic close if they navigate away without selecting. 
            // In a full integration, you wire `useCombobox` methods to these keys.
            if (e.key === 'Enter') {
                // Let downshift handle enter if it's open and something is highlighted
            }
        }

        if (e.key === 'Enter') {
            if (acShow) return; // Wait for selection if open
            e.preventDefault();

            let newType: BlockType = 'action';
            if (block.type === 'scene_heading') newType = 'action';
            else if (block.type === 'character') newType = 'dialogue';
            else if (block.type === 'dialogue') newType = 'character';
            else if (block.type === 'parenthetical') newType = 'dialogue';
            else if (block.type === 'action') newType = 'action';

            const newBlock: Block = { id: generateId(), type: newType, content: '' };
            const newBlocks = [...blocks];
            newBlocks.splice(index + 1, 0, newBlock);
            setBlocks(newBlocks);
            setFocusedId(newBlock.id);
            setShouldFocus(true);
        }
        else if (e.key === 'Tab') {
            e.preventDefault();
            const cycle: BlockType[] = ['scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'];
            const currentIndex = cycle.indexOf(block.type);
            const newType = cycle[(currentIndex + 1) % cycle.length];

            const newBlocks = [...blocks];
            newBlocks[index].type = newType;
            setBlocks(newBlocks);
        }
        else if (e.key === 'Backspace') {
            const text = e.currentTarget.textContent || '';
            if (text === '') {
                if (index > 0) {
                    e.preventDefault();
                    const newBlocks = [...blocks];
                    newBlocks.splice(index, 1);
                    setBlocks(newBlocks);
                    setFocusedId(blocks[index - 1].id);
                    setShouldFocus(true);
                }
            }
        }
    };

    const handleInput = (text: string, index: number) => {
        const newBlocks = [...blocks];
        newBlocks[index].content = text;
        setBlocks(newBlocks);

        // --- Autocomplete Trigger Logic ---
        const block = newBlocks[index];
        if (block.type === 'scene_heading') {
            const upperText = text.toUpperCase();
            let matchedOptions: string[] = [];
            let matchStart = 0;
            let matchEnd = text.length;

            // 1. Prefix: Empty or typing "I", "E"
            if (upperText.length < 5 && !upperText.includes('.')) {
                const prefixes = ['INT. ', 'EXT. ', 'INT./EXT. '];
                matchedOptions = prefixes.filter(p => p.startsWith(upperText));
                matchStart = 0;
            }
            // 2. Time: Typing " - "
            else if (upperText.includes(' - ')) {
                const parts = upperText.split(' - ');
                const timePrefix = parts[1] || '';
                const times = ['DAY', 'NIGHT', 'LATER', 'CONTINUOUS', 'MOMENTS LATER'];
                matchedOptions = times.filter(t => t.startsWith(timePrefix));
                matchStart = upperText.lastIndexOf(' - ') + 3;
            }
            // 3. Location: Typed prefix, but no dash yet
            else if ((upperText.startsWith('INT. ') || upperText.startsWith('EXT. ') || upperText.startsWith('INT./EXT. ')) && !upperText.includes(' - ')) {
                const prefixMatch = upperText.match(/^(INT\.|EXT\.|INT\.\/EXT\.)\s*/i);
                if (prefixMatch) {
                    const locPrefix = upperText.substring(prefixMatch[0].length);
                    if (locPrefix.length > 0) {
                        matchedOptions = knownLocations.filter(loc => loc.startsWith(locPrefix) && loc !== locPrefix);
                        matchStart = prefixMatch[0].length;
                    }
                }
            }

            if (matchedOptions.length > 0) {
                // Get Caret Rect robustly
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    let rect = range.getBoundingClientRect();

                    // Fallback for empty/collapsed zero-width rects or zero-x (sometimes happens on empty elements)
                    if (rect.x === 0 && rect.y === 0) {
                        const span = document.createElement('span');
                        span.textContent = '\u200b';
                        range.insertNode(span);
                        rect = span.getBoundingClientRect();
                        span.parentNode?.removeChild(span);
                    }

                    if (rect.x !== 0 || rect.y !== 0) {
                        setAcAnchorRect({
                            x: rect.x,
                            y: rect.y,
                            top: rect.top,
                            bottom: rect.bottom,
                            left: rect.left,
                            right: rect.right,
                            width: rect.width,
                            height: rect.height
                        });
                    }
                }
                setAcOptions(matchedOptions);
                setAcMatchRange({ start: matchStart, end: matchEnd });
                setAcShow(true);
            } else {
                setAcShow(false);
            }
        } else {
            setAcShow(false);
        }
    };

    const handleAutocompleteSelect = (value: string) => {
        if (!focusedId || !acMatchRange) return;

        const index = blocks.findIndex(b => b.id === focusedId);
        if (index === -1) return;

        const block = blocks[index];
        const newText = block.content.substring(0, acMatchRange.start) + value;

        const newBlocks = [...blocks];
        newBlocks[index].content = newText;
        setBlocks(newBlocks);
        setAcShow(false);

        // Re-focus and set caret to end
        setShouldFocus(true);
    };

    return (
        <div style={{
            flex: 1,
            backgroundColor: 'var(--bg-primary)',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            padding: '40px 0'
        }} id="editor-container">
            <div style={{
                width: 'var(--screenplay-width)',
                backgroundColor: 'var(--bg-primary)',
                minHeight: '1000px',
                padding: '96px',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                fontFamily: "'Courier Prime', 'Courier New', monospace",
                fontSize: '16px',
                lineHeight: '1.4',
                color: 'var(--text-primary)'
            }}>
                {blocks.map((block, index) => (
                    <EditorBlock
                        key={block.id}
                        block={block}
                        index={index}
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        onFocus={setFocusedId}
                        setRef={(id, el) => { blockRefs.current[id] = el; }}
                    />
                ))}
            </div>

            <Autocomplete
                isOpen={acShow}
                options={acOptions}
                anchorRect={acAnchorRect}
                onSelect={handleAutocompleteSelect}
                onClose={() => setAcShow(false)}
            />
        </div>
    );
};
