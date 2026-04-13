import React from 'react';

const Sidebar = ({ 
  fileHandles, 
  selectedFileName, 
  onFileSelect, 
  linkMode, 
  setLinkMode, 
  isParallel, 
  setIsParallel, 
  onSave 
}) => {
  return (
    <div style={{ width: '220px', borderRight: '1px solid #222', padding: '10px', backgroundColor: '#0d0d0d', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {fileHandles.map(h => (
          <div 
            key={h.name} 
            onClick={() => onFileSelect(h)} 
            style={{ 
              padding: '8px', cursor: 'pointer', fontSize: '12px', 
              color: selectedFileName === h.name ? '#00ffff' : '#888', 
              borderLeft: selectedFileName === h.name ? '2px solid #00ffff' : '2px solid transparent' 
            }}
          >📄 {h.name}</div>
        ))}
      </div>

      <div style={{ padding: '10px 0', borderTop: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '10px', color: '#555' }}>ÂM DƯƠNG</div>
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