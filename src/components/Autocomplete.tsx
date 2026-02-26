import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FC } from 'react';
import { useFloating, flip, shift, offset } from '@floating-ui/react';
import { useCombobox } from 'downshift';
import { motion, AnimatePresence } from 'framer-motion';

export interface AutocompleteProps {
    isOpen: boolean;
    options: string[];
    anchorRect: { x: number, y: number, width: number, height: number, top: number, bottom: number, left: number, right: number } | null;
    onSelect: (value: string) => void;
    onClose: () => void;
}

export const Autocomplete: FC<AutocompleteProps> = ({
    isOpen,
    options,
    anchorRect,
    onSelect,
    onClose
}) => {
    // Use Floating UI to position the popup relative to the active block
    const { refs, floatingStyles, x, y } = useFloating({
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [
            offset(8), // 8px gap
            flip(),    // Flip to top if not enough space
            shift({ padding: 8 }) // Shift horizontally to stay strictly on screen
        ]
    });

    useEffect(() => {
        if (anchorRect) {
            refs.setReference({
                getBoundingClientRect: () => anchorRect,
                getClientRects: () => [anchorRect] as unknown as DOMRectList
            } as Element);
        } else {
            refs.setReference(null);
        }
    }, [anchorRect, refs]);

    const {
        getMenuProps,
        getItemProps,
        highlightedIndex,
        setHighlightedIndex,
    } = useCombobox({
        isOpen: isOpen && options.length > 0,
        items: options,
        onIsOpenChange: ({ isOpen }) => {
            if (!isOpen) onClose();
        },
        onSelectedItemChange: ({ selectedItem }) => {
            if (selectedItem) {
                onSelect(selectedItem);
            }
        },
        // We don't want Downshift to manage the input value, we manage the contentEditable
        // ourselves. This is purely for driving keyboard navigation over the list.
        initialInputValue: '',
        stateReducer: (_state, actionAndChanges) => {
            const { type, changes } = actionAndChanges;
            switch (type) {
                case useCombobox.stateChangeTypes.InputKeyDownEnter:
                case useCombobox.stateChangeTypes.ItemClick:
                    return {
                        ...changes,
                        isOpen: false, // Close on select
                        highlightedIndex: -1
                    };
                default:
                    return changes;
            }
        }
    });

    // Global keydown listener to hijack Arrow keys when open 
    // without losing focus in the contentEditable
    useEffect(() => {
        if (!isOpen || options.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                setHighlightedIndex(highlightedIndex < options.length - 1 ? highlightedIndex + 1 : 0);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                setHighlightedIndex(highlightedIndex > 0 ? highlightedIndex - 1 : options.length - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                    onSelect(options[highlightedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, options, highlightedIndex, onSelect, onClose, setHighlightedIndex]);

    const isPositionComputed = x !== null && y !== null;

    return createPortal(
        <AnimatePresence>
            {(isOpen && options.length > 0 && isPositionComputed) && (
                <motion.div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="autocomplete-popup"
                >
                    <ul
                        {...getMenuProps()}
                        style={{
                            margin: 0,
                            padding: '4px',
                            listStyle: 'none',
                            backgroundColor: 'rgba(30, 30, 30, 0.85)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            minWidth: '200px',
                            fontFamily: "'Inter', sans-serif"
                        }}
                    >
                        {options.map((item: string, index: number) => (
                            <li
                                key={item}
                                {...getItemProps({ item, index })}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    backgroundColor: highlightedIndex === index ? 'var(--accent)' : 'transparent',
                                    color: highlightedIndex === index ? '#fff' : 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    transition: 'background-color 0.1s ease',
                                }}
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
