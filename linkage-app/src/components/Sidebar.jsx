import React, { useEffect, useRef } from 'react';

const Sidebar = ({ 
  fileHandles, 
  selectedFileName, 
  onFileSelect, 
  linkMode, 
  setLinkMode, 
  isParallel, 
  setIsParallel, 
  writingMode,    // Prop nhận từ App
  setWritingMode, // Prop nhận từ App
  onSave,
  editingNode, 
  onUpdateNode, 
  onCloseEditor 
}) => {
  const nameInputRef = useRef(null);

  // LOGIC: Global Typing Catch (Fix duplicate, Enter/Shift+Enter & Writing Mode)
useEffect(() => {
    const handleGlobalTyping = (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA';
      
      if (editingNode) {
        // --- 1. XỬ LÝ PHÍM ESC (LUÔN LÀ HỦY CHỌN) ---
        if (e.key === 'Escape') {
          e.preventDefault();
          if (isInputFocused) activeEl.blur();
          onCloseEditor(); // Đóng Sidebar, Node hết hồng
          return;
        }

        // --- 2. XỬ LÝ PHÍM ENTER ---
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          
          if (isInputFocused) activeEl.blur();

          if (writingMode) {
            // MODE WRITING: Đẻ con (Reborn)
            window.dispatchEvent(new CustomEvent('reborn-node', { 
              detail: { sourceId: editingNode.id } 
            }));
          } else {
            // MODE NONE-WRITING: Tạm thời vẫn là Hủy chọn giống ESC
            onCloseEditor(); 
          }
          return;
        }

        // --- 3. LOGIC GÕ PHÍM KHI CHƯA FOCUS ---
        if (!isInputFocused && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          nameInputRef.current.focus();
          if (editingNode.name === "New Node") {
            onUpdateNode(editingNode.id, 'name', e.key);
          } else {
            onUpdateNode(editingNode.id, 'name', (editingNode.name || '') + e.key);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalTyping);
    return () => window.removeEventListener('keydown', handleGlobalTyping);
  }, [editingNode, onUpdateNode, writingMode, onCloseEditor]);
  return (
    <div style={{ width: '220px', borderRight: '1px solid #222', padding: '10px', backgroundColor: '#0d0d0d', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* 1. DANH SÁCH FILE */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', color: '#555', marginBottom: '8px' }}>FILES</div>
        {fileHandles.map(h => (
          <div 
            key={h.name} 
            onClick={() => onFileSelect(h)} 
            style={{ 
              padding: '8px', cursor: 'pointer', fontSize: '12px', 
              color: selectedFileName === h.name ? '#00ffff' : '#888', 
              borderLeft: selectedFileName === h.name ? '2px solid #00ffff' : '2px solid transparent',
              backgroundColor: selectedFileName === h.name ? '#111' : 'transparent',
              marginBottom: '2px'
            }}
          >📄 {h.name}</div>
        ))}
      </div>

      {/* 2. NODE PROPERTY EDITOR */}
      {editingNode && (
        <div style={{ padding: '10px', backgroundColor: '#1a1a1a', border: '1px solid #ff00ff', borderRadius: '4px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ color: '#ff00ff', fontSize: '10px', fontWeight: 'bold' }}>EDIT: {editingNode.id}</span>
            <button onClick={onCloseEditor} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
            <label>
              <div style={{ color: '#555', marginBottom: '2px' }}>DISPLAY NAME</div>
              <textarea 
                ref={nameInputRef}
                rows={3}
                style={{ 
                  width: '100%', backgroundColor: '#000', color: '#fff', 
                  border: '1px solid #333', padding: '5px', outline: 'none',
                  resize: 'none', fontFamily: 'inherit', fontSize: '11px'
                }}
                value={editingNode.name || ''} 
                onChange={(e) => onUpdateNode(editingNode.id, 'name', e.target.value)} 
              />
            </label>

            <label>
              <div style={{ color: '#555', marginBottom: '2px' }}>COLOR</div>
              <select 
                style={{ width: '100%', backgroundColor: '#000', color: '#fff', border: '1px solid #333', padding: '5px', outline: 'none' }}
                value={editingNode.color || 'B'} 
                onChange={(e) => onUpdateNode(editingNode.id, 'color', e.target.value)}
              >
                <option value="B">Blue (Default)</option>
                <option value="G">Green</option>
                <option value="Y">Yellow</option>
                <option value="P">Purple</option>
              </select>
            </label>

            <label>
              <div style={{ color: '#555', marginBottom: '2px' }}>RANK (BORDER)</div>
              <input 
                type="number" min="0" max="4"
                style={{ width: '100%', backgroundColor: '#000', color: '#fff', border: '1px solid #333', padding: '5px', outline: 'none' }}
                value={editingNode.rank || 0} 
                onChange={(e) => onUpdateNode(editingNode.id, 'rank', parseInt(e.target.value) || 0)} 
              />
            </label>
          </div>
        </div>
      )}

      {/* 3. CONTROL PANEL */}
      <div style={{ padding: '10px 0', borderTop: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* NÚT TOGGLE WRITING MODE */}
        <div style={{ fontSize: '10px', color: '#555' }}>CHẾ ĐỘ NHẬP</div>
        <button 
          onClick={() => setWritingMode(!writingMode)} 
          style={{ 
            width: '100%', fontSize: '10px', padding: '8px', 
            backgroundColor: writingMode ? '#ff00ff' : '#222', 
            color: writingMode ? '#000' : '#fff', 
            border: 'none', borderRadius: '3px', cursor: 'pointer',
            fontWeight: 'bold', transition: '0.2s ease'
          }}
        >
          {writingMode ? 'WRITING MODE: ON' : 'WRITING MODE: OFF'}
        </button>

        <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>ÂM DƯƠNG</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setLinkMode(1)} style={{ flex: 1, fontSize: '10px', padding: '6px', backgroundColor: linkMode === 1 ? '#00ffff' : '#222', color: linkMode === 1 ? '#000' : '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>DƯƠNG (+)</button>
          <button onClick={() => setLinkMode(2)} style={{ flex: 1, fontSize: '10px', padding: '6px', backgroundColor: linkMode === 2 ? '#3498db' : '#222', color: linkMode === 2 ? '#fff' : '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>ÂM (-)</button>
        </div>

        <div style={{ fontSize: '10px', color: '#555' }}>KIỂU MẠCH</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setIsParallel(false)} style={{ flex: 1, fontSize: '10px', padding: '6px', backgroundColor: !isParallel ? '#2ecc71' : '#222', color: !isParallel ? '#000' : '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>SERIAL</button>
          <button onClick={() => setIsParallel(true)} style={{ flex: 1, fontSize: '10px', padding: '6px', backgroundColor: isParallel ? '#e67e22' : '#222', color: isParallel ? '#000' : '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>PARALLEL</button>
        </div>

        <button onClick={onSave} style={{ width: '100%', padding: '12px', backgroundColor: '#111', color: '#00ff00', border: '1px solid #00ff00', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>SAVE CHANGES</button>
      </div>
    </div>
  );
};

export default Sidebar;