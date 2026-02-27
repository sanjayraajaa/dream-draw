import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FC } from 'react';
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
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

    useLayoutEffect(() => {
        if (!isOpen || options.length === 0 || !anchorRect) {
            setMenuPos(null);
            return;
        }

        const viewportPadding = 10;
        const estimatedWidth = menuRef.current?.offsetWidth ?? 260;
        const estimatedHeight = menuRef.current?.offsetHeight ?? Math.min(options.length * 40 + 12, 240);

        let left = anchorRect.left;
        let top = anchorRect.bottom + 8;

        if (left + estimatedWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - estimatedWidth - viewportPadding;
        }
        if (left < viewportPadding) {
            left = viewportPadding;
        }

        if (top + estimatedHeight > window.innerHeight - viewportPadding) {
            top = anchorRect.top - estimatedHeight - 8;
        }
        if (top < viewportPadding) {
            top = viewportPadding;
        }

        setMenuPos({ left, top });
    }, [isOpen, options, anchorRect]);

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

    const isPositionComputed = menuPos !== null;

    return createPortal(
        <AnimatePresence>
            {(isOpen && options.length > 0 && isPositionComputed) && (
                <motion.div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        left: menuPos?.left ?? 0,
                        top: menuPos?.top ?? 0,
                        zIndex: 10000
                    }}
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="autocomplete-popup"
                >
                    <ul
                        {...getMenuProps()}
                        style={{
                            margin: 0,
                            padding: '4px',
                            listStyle: 'none',
                            background: 'linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(14,14,14,0.98) 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            boxShadow: '0 14px 40px rgba(0, 0, 0, 0.55)',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            minWidth: '240px',
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
