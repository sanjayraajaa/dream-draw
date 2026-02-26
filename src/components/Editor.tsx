import { useState, useRef, useEffect, KeyboardEvent } from 'react';


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

        if (e.key === 'Enter') {
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
        </div>
    );
};
