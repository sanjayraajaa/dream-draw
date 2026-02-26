import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { Editor, Block, generateId } from './components/Editor'
import './App.css'

function App() {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: generateId(), type: 'scene_heading', content: 'INT. COFFEE SHOP - DAY' },
    { id: generateId(), type: 'action', content: 'A lonely writer stares at an empty page.' },
  ]);

  return (
    <>
      <Toolbar />
      <div className="layout-container">
        <Sidebar blocks={blocks} />
        <Editor blocks={blocks} setBlocks={setBlocks} />
      </div>
    </>
  )
}

export default App
