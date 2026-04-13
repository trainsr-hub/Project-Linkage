import React, { useState, useMemo, useRef, useEffect } from 'react';
import yaml from 'js-yaml';
import { get, set } from 'idb-keyval';
import Header from '../components/Header';

function App() {
  const [rootHandle, setRootHandle] = useState(null);
  const [vaults, setVaults] = useState([]); 
  const [fileHandles, setFileHandles] = useState([]);
  const [linkageData, setLinkageData] = useState(null); 
  const [selectedFileName, setSelectedFileName] = useState("");
  const [dragChain, setDragChain] = useState(null);
  const viewportRef = useRef(null);

  const colorMap = { 'P': '#7d56f5', 'G': '#2ecc71', 'B': '#3498db', 'Y': '#f1c40f' };
  const rankStrokeMap = { 1: '#000000', 2: '#ffffff', 3: '#0000FF', 4: '#FFD700' };

  // --- HELPER TRUY XUẤT ---
  const getFolderByPath = async (root, pathArray) => {
    let current = root;
    for (const name of pathArray) {
      current = await current.getDirectoryHandle(name);
    }
    return current;
  };

  // --- 1. KHÔI PHỤC KẾT NỐI ---
  useEffect(() => {
    const init = async () => {
      const savedRoot = await get('master_root_handle');
      if (savedRoot) {
        const permission = await savedRoot.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') await setupProject(savedRoot);
      }
    };
    init();
  }, []);

  const setupProject = async (handle) => {
    setRootHandle(handle);
    try {
      const dataFolder = await handle.getDirectoryHandle('data', { create: true });
      const vaultFileHandle = await dataFolder.getFileHandle('Vault.json', { create: true });
      const file = await vaultFileHandle.getFile();
      const text = await file.text();
      
      let config = { vaults: [] };
      try { config = text ? JSON.parse(text) : { vaults: [] }; } catch(e) {}
      
      const loadedVaults = [];
      if (config.vaults && Array.isArray(config.vaults)) {
        for (const v of config.vaults) {
          try {
            if (v.path) {
              const vHandle = await getFolderByPath(handle, v.path);
              loadedVaults.push(vHandle);
            }
          } catch (e) { console.warn(`Missing: ${v.name}`); }
        }
      }
      setVaults(loadedVaults);
      if (loadedVaults.length > 0) loadFilesAndSelectFirst(loadedVaults[0]);
    } catch (err) { console.error("Setup error:", err); }
  };

  const handleSelectMasterFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await set('master_root_handle', handle);
      await setupProject(handle);
    } catch (err) { }
  };

  // --- 2. LOGIC LƯU PATH VÀO JSON (SỬA LẠI CHUẨN) ---
  const saveToVaultJson = async (updatedVaultHandles) => {
    if (!rootHandle) return;
    try {
      const dataFolder = await rootHandle.getDirectoryHandle('data');
      const vaultFileHandle = await dataFolder.getFileHandle('Vault.json');
      const writable = await vaultFileHandle.createWritable();
      
      // Chuyển đổi mảng Handle thành mảng Path JSON
      const vaultDataForJson = [];
      for (const vh of updatedVaultHandles) {
        const path = await rootHandle.resolve(vh);
        if (path) {
          vaultDataForJson.push({ name: vh.name, path: path });
        }
      }

      await writable.write(JSON.stringify({ vaults: vaultDataForJson }, null, 2));
      await writable.close();
      console.log("Vault.json synced with relative paths.");
    } catch (err) { console.error("Write error:", err); }
  };

  const handleAddNewVault = async () => {
    if (!rootHandle) return;
    try {
      const directoryHandle = await window.showDirectoryPicker();
      const relativePath = await rootHandle.resolve(directoryHandle);
      
      if (!relativePath) {
        alert("Lỗi: Vault phải nằm bên trong Master Folder!");
        return;
      }

      const isExist = vaults.some(v => v.name === directoryHandle.name);
      if (!isExist) {
        const newList = [...vaults, directoryHandle];
        setVaults(newList);
        await saveToVaultJson(newList); // Ghi file JSON với mảng path
      }
      await loadFilesAndSelectFirst(directoryHandle);
    } catch (err) { }
  };

  // --- CÁC LOGIC ENGINE (GIỮ NGUYÊN) ---
  const handleSwitchVault = async (handle) => await loadFilesAndSelectFirst(handle);

  const loadFilesAndSelectFirst = async (directoryHandle) => {
    const files = [];
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) files.push(entry);
    }
    setFileHandles(files);
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileSelect = async (handle) => {
    const file = await handle.getFile();
    const content = await file.text();
    setSelectedFileName(handle.name);
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (match && match[1]) {
      const parsed = yaml.load(match[1]);
      if (parsed?.Linkage_DB) setLinkageData(parsed.Linkage_DB);
    }
  };

  // --- RENDER & SVG LOGIC (GIỮ NGUYÊN NHƯ BẢN TRƯỚC) ---
  const { nodes, edges } = useMemo(() => {
    if (!linkageData) return { nodes: [], edges: [] };
    const db = linkageData;
    const allIds = Object.keys(db);
    const targetedIds = new Set(Object.values(db).flatMap(info => info.links_to || []));
    const filteredBase = allIds.map(id => ({ id, ...db[id] })).filter(node => !(node.rank === 0 && targetedIds.has(node.id)));
    const validIds = new Set(filteredBase.map(n => n.id));
    const roots = filteredBase.filter(n => !filteredBase.some(other => other.links_to?.includes(n.id)));
    const nodeCoords = {}; let currentGlobalRow = 0;
    const layoutBranch = (nodeId, level, startRow, visited = new Set()) => {
      if (nodeCoords[nodeId] || visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const children = db[nodeId]?.links_to?.filter(cid => validIds.has(cid)) || [];
      if (children.length === 0) { nodeCoords[nodeId] = { x: level * 280 + 50, y: startRow * 110 + 80 }; return 1; }
      let totalSlotsUsed = 0; let childrenYSum = 0;
      children.forEach(childId => {
        const slots = layoutBranch(childId, level + 1, startRow + totalSlotsUsed, new Set(visited));
        totalSlotsUsed += slots;
        if (nodeCoords[childId]) childrenYSum += nodeCoords[childId].y;
      });
      nodeCoords[nodeId] = { x: level * 280 + 50, y: childrenYSum / (children.length || 1) };
      return totalSlotsUsed;
    };
    roots.forEach(root => { currentGlobalRow += layoutBranch(root.id, 0, currentGlobalRow); });
    filteredBase.forEach(n => { if (!nodeCoords[n.id]) { nodeCoords[n.id] = { x: 0, y: currentGlobalRow * 110 + 80 }; currentGlobalRow++; } });
    const finalNodes = filteredBase.map(node => {
      let displayName = String(node.name || "");
      const match = displayName.match(/\[\[(?:.*\|)?(.*)\]\]/);
      return { ...node, displayName: match ? match[1] : displayName, ...nodeCoords[node.id] };
    });
    const nodeMap = Object.fromEntries(finalNodes.map(n => [n.id, n]));
    const generatedEdges = finalNodes.flatMap(source => (source.links_to || []).filter(tid => nodeMap[tid]).map(tid => ({ fromX: source.x + 95, fromY: source.y + 27.5, toX: nodeMap[tid].x + 95, toY: nodeMap[tid].y + 27.5 })));
    return { nodes: finalNodes, edges: generatedEdges };
  }, [linkageData]);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!dragChain || !viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + viewportRef.current.scrollLeft;
      const mouseY = e.clientY - rect.top + viewportRef.current.scrollTop;
      let hitId = null;
      nodes.forEach(node => {
        const cx = node.x + 95; const cy = node.y + 27.5;
        const hw = 190 * 0.45; const hh = 55 * 0.45;
        if (mouseX >= cx - hw && mouseX <= cx + hw && mouseY >= cy - hh && mouseY <= cy + hh) hitId = node.id;
      });
      if (hitId) {
        const lastIdx = dragChain.nodeIds.length - 1;
        if (lastIdx > 0 && dragChain.nodeIds[lastIdx - 1] === hitId) {
          setDragChain(prev => ({ ...prev, nodeIds: prev.nodeIds.slice(0, -1), mouseX, mouseY }));
        } else if (!dragChain.nodeIds.includes(hitId)) {
          setDragChain(prev => ({ ...prev, nodeIds: [...prev.nodeIds, hitId], mouseX, mouseY }));
        }
      } else { setDragChain(prev => ({ ...prev, mouseX, mouseY })); }
    };
    const handleGlobalMouseUp = () => setDragChain(null);
    if (dragChain) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragChain, nodes]);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'monospace', userSelect: 'none' }}>
      <Header 
        onConfigOpen={handleSelectMasterFolder}
        configLoaded={!!rootHandle}
        onFolderOpen={handleAddNewVault}
        selectedFile={selectedFileName} 
        vaults={vaults}
        onSwitchVault={handleSwitchVault}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '200px', borderRight: '1px solid #222', padding: '10px', overflowY: 'auto', backgroundColor: '#0d0d0d' }}>
          {fileHandles.map(h => (
            <div key={h.name} onClick={() => handleFileSelect(h)} style={{ padding: '8px', cursor: 'pointer', fontSize: '12px', color: selectedFileName === h.name ? '#00ffff' : '#888' }}>📄 {h.name}</div>
          ))}
        </div>
        <div ref={viewportRef} onContextMenu={(e) => e.preventDefault()} style={{ flex: 1, position: 'relative', overflow: 'auto', backgroundColor: '#050505' }}>
          <div style={{ position: 'absolute', width: '4000px', height: '4000px', backgroundImage: 'radial-gradient(#222 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.5 }} />
          <svg style={{ position: 'absolute', width: '4000px', height: '4000px', top: 0, left: 0, pointerEvents: 'none' }}>
            {edges.map((edge, i) => (
              <line key={i} x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} stroke="#ffffff22" strokeWidth="1" />
            ))}
            {dragChain && dragChain.nodeIds.map((id, idx) => {
              const currentNode = nodes.find(n => n.id === id);
              if (!currentNode) return null;
              const startX = currentNode.x + 95; const startY = currentNode.y + 27.5;
              if (idx === dragChain.nodeIds.length - 1) return <line key={id} x1={startX} y1={startY} x2={dragChain.mouseX} y2={dragChain.mouseY} stroke="#00ffff" strokeWidth="2" strokeDasharray="4" />;
              const nextNode = nodes.find(n => n.id === dragChain.nodeIds[idx + 1]);
              return <line key={id} x1={startX} y1={startY} x2={nextNode.x + 95} y2={nextNode.y + 27.5} stroke="#00ffff" strokeWidth="2.5" />;
            })}
          </svg>
          {nodes.map((node) => {
            const isInChain = dragChain?.nodeIds.includes(node.id);
            return (
              <div 
                key={node.id} 
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    const rect = viewportRef.current.getBoundingClientRect();
                    setDragChain({ nodeIds: [node.id], mouseX: e.clientX - rect.left + viewportRef.current.scrollLeft, mouseY: e.clientY - rect.top + viewportRef.current.scrollTop });
                  }
                }}
                style={{ 
                  position: 'absolute', left: node.x, top: node.y, width: '190px', height: '55px', backgroundColor: colorMap[node.color], 
                  color: (node.color === 'G' || node.color === 'Y') ? '#000' : '#fff', border: `${node.rank > 0 ? '3px' : '1px'} solid ${isInChain ? '#00ffff' : rankStrokeMap[node.rank] || 'transparent'}`, 
                  borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', zIndex: 10,
                  boxShadow: isInChain ? '0 0 15px #00ffff' : '0 4px 10px rgba(0,0,0,0.5)', transform: isInChain ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.1s, box-shadow 0.1s', cursor: 'crosshair'
                }}
              >{node.displayName}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;