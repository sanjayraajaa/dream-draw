import type { FC } from 'react';
import type { Block } from './Editor';

interface SidebarProps {
    blocks: Block[];
}

export const Sidebar: FC<SidebarProps> = ({ blocks }) => {
    const scenes = blocks.filter(b => b.type === 'scene_heading');

    const scrollToScene = (id: string) => {
        const el = document.getElementById(`block-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div style={{
            width: '250px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px'
        }}>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: 0 }}>Scenes</h3>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scenes.map((scene, idx) => (
                    <div
                        key={scene.id}
                        onClick={() => scrollToScene(scene.id)}
                        style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            opacity: 0.8,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                    >
                        {idx + 1}. {scene.content || 'Untitled Scene'}
                    </div>
                ))}
                {scenes.length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No scenes yet</div>
                )}
            </div>
        </div>
    );
};
