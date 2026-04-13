import React from 'react';

const Header = ({ 
  onConfigOpen, 
  configLoaded, 
  selectedFile, 
  vaults, 
  onSwitchVault,
  onFolderOpen 
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
      <h2 style={{ color: '#00ffff', margin: 0, fontSize: '18px' }}>LINKAGE SYSTEM</h2>
      
      {!configLoaded ? (
        <button 
          onClick={onConfigOpen} 
          style={{ 
            backgroundColor: '#ff4444', 
            color: '#fff', 
            border: 'none', 
            padding: '6px 15px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          CONNECT MASTER FOLDER
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
            <option value="">-- Select Vault --</option>
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

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ color: '#444', fontSize: '10px' }}>MASTER ACCESS: {configLoaded ? 'GRANTED' : 'LOCKED'}</span>
          <span style={{ color: '#888', fontSize: '12px' }}>
            FILE: <span style={{ color: '#00ffff' }}>{selectedFile || "NONE"}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Header;