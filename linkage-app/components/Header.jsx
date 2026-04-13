import React from 'react';

const Header = ({ 
  onFolderOpen, 
  onConfigOpen, 
  configLoaded, 
  selectedFile, 
  vaults, 
  onSwitchVault 
}) => {
  return (
    <div style={{ 
      padding: '10px 20px', 
      borderBottom: '1px solid #333', 
      display: 'flex', 
      gap: '15px', 
      alignItems: 'center', 
      backgroundColor: '#111', 
      zIndex: 100,
      userSelect: 'none'
    }}>
      <h2 style={{ color: '#00ffff', margin: 0, fontSize: '18px' }}>LINKAGE</h2>
      
      {!configLoaded ? (
        <button 
          onClick={onConfigOpen} 
          style={{ 
            backgroundColor: '#ff4444', 
            color: '#fff', 
            border: 'none', 
            padding: '6px 12px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          CONNECT CONFIG (Vault.json)
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            onChange={(e) => {
              const selected = vaults.find(v => v.name === e.target.value);
              if (selected) onSwitchVault(selected);
            }}
            style={{ 
              backgroundColor: '#000', 
              color: '#00ffff', 
              border: '1px solid #333', 
              padding: '5px', 
              borderRadius: '4px', 
              fontSize: '12px',
              outline: 'none'
            }}
          >
            <option value="">-- Switch Vault --</option>
            {vaults.map(v => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>

          <button 
            onClick={onFolderOpen} 
            style={{ 
              backgroundColor: '#222', 
              color: '#00ffff', 
              border: '1px solid #00ffff', 
              padding: '5px 12px', 
              cursor: 'pointer', 
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            + ADD VAULT
          </button>
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: '#444', fontSize: '11px' }}>STATUS: {configLoaded ? 'CONNECTED' : 'OFFLINE'}</span>
        <span style={{ color: '#888', fontSize: '12px', borderLeft: '1px solid #333', paddingLeft: '10px' }}>
          FILE: <span style={{ color: '#00ffff' }}>{selectedFile || "NONE"}</span>
        </span>
      </div>
    </div>
  );
};

// Dòng này cực kỳ quan trọng để sửa lỗi SyntaxError của ông
export default Header;