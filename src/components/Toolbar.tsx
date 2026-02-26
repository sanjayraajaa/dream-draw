import type { FC, CSSProperties } from 'react';

export const Toolbar: FC = () => {
    return (
        <div className="toolbar" style={{
            height: '48px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            WebkitAppRegion: 'drag' // For electron dragging if frameless
        } as CSSProperties}>
            <div style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }}>DREAM DRAW</div>
            <div style={{ flex: 1 }} />
            {/* Additional toolbar actions can go here */}
        </div>
    );
};
