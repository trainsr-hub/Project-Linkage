import React, { useState, useMemo, useRef, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import Sidebar from './components/Sidebar';
import GraphViewport from './components/GraphViewport';
import Header from './components/Header';
import { parseLinkageFile, composeLinkageFile } from './utils/fileProcessor';
import { calculateLayout } from './utils/layoutEngine'; // Giữ lại một dòng duy nhất này

function App() {
  const [rootHandle, setRootHandle] = useState(null);
  const [vaults, setVaults] = useState([]); 
  const [fileHandles, setFileHandles] = useState([]);
  const [linkageData, setLinkageData] = useState(null); 
  const [selectedFileName, setSelectedFileName] = useState("");
  const [activeFileHandle, setActiveFileHandle] = useState(null);
  const [dragChain, setDragChain] = useState(null);
  
  // State Mode
  const [linkMode, setLinkMode] = useState(1); 
  const [isParallel, setIsParallel] = useState(false); 

  const viewportRef = useRef(null);

  const colorMap = { 'P': '#7d56f5', 'G': '#2ecc71', 'B': '#3498db', 'Y': '#f1c40f' };
  const rankStrokeMap = { 1: '#000000', 2: '#ffffff', 3: '#0000FF', 4: '#FFD700' };

  // --- ENGINE ---
  const { nodes, edges } = useMemo(() => calculateLayout(linkageData), [linkageData]);

  // --- KHÔI PHỤC DỮ LIỆU ---
  useEffect(() => {
    const init = async () => {
      const savedRoot = await get('master_root_handle');
      if (savedRoot && (await savedRoot.queryPermission({ mode: 'readwrite' })) === 'granted') setupProject(savedRoot);
    };
    init();
  }, []);

  const setupProject = async (handle) => {
    setRootHandle(handle);
    try {
      const dataFolder = await handle.getDirectoryHandle('data', { create: true });
      const vaultFileHandle = await dataFolder.getFileHandle('Vault.json', { create: true });
      const text = await (await vaultFileHandle.getFile()).text();
      let config = text ? JSON.parse(text) : { vaults: [] };
      
      const loadedVaults = [];
      for (const v of config.vaults) {
        try {
          let current = handle;
          for (const name of v.path) current = await current.getDirectoryHandle(name);
          loadedVaults.push(current);
        } catch (e) {}
      }
      setVaults(loadedVaults);
      if (loadedVaults.length > 0) loadFiles(loadedVaults[0]);
    } catch (err) {}
  };

  // --- FILE OPS ---
  const handleSelectMaster = async () => {
    const handle = await window.showDirectoryPicker();
    await set('master_root_handle', handle);
    setupProject(handle);
  };

  const handleAddNewVault = async () => {
    if (!rootHandle) return;
    const dir = await window.showDirectoryPicker();
    const path = await rootHandle.resolve(dir);
    if (!path) return alert("Ngoài Master Folder!");
    const newList = [...vaults, dir].filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
    setVaults(newList);
    const vaultData = await Promise.all(newList.map(async vh => ({ name: vh.name, path: await rootHandle.resolve(vh) })));
    const writable = await (await (await rootHandle.getDirectoryHandle('data')).getFileHandle('Vault.json')).createWritable();
    await writable.write(JSON.stringify({ vaults: vaultData }, null, 2));
    await writable.close();
    loadFiles(dir);
  };

  const loadFiles = async (dir) => {
    const files = [];
    for await (const entry of dir.values()) if (entry.kind === 'file' && entry.name.endsWith('.md')) files.push(entry);
    setFileHandles(files);
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileSelect = async (handle) => {
    const content = await (await handle.getFile()).text();
    setSelectedFileName(handle.name);
    setActiveFileHandle(handle);
    const res = parseLinkageFile(content);
    setLinkageData(res.success ? res.parsedData : null);
  };

  const handleSave = async () => {
    if (!activeFileHandle || !linkageData) return;
    const content = await (await activeFileHandle.getFile()).text();
    const { part1, part3, success } = parseLinkageFile(content);
    if (!success) return;
    const writable = await activeFileHandle.createWritable();
    await writable.write(composeLinkageFile(part1, linkageData, part3));
    await writable.close();
  };

  // --- LOGIC KÉO XÍCH ---
  const onNodeMouseDown = (e, id) => {
    if (e.button !== 0) return;
    const rect = viewportRef.current.getBoundingClientRect();
    setDragChain({ nodeIds: [id], mouseX: e.clientX - rect.left + viewportRef.current.scrollLeft, mouseY: e.clientY - rect.top + viewportRef.current.scrollTop });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragChain) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left + viewportRef.current.scrollLeft;
      const my = e.clientY - rect.top + viewportRef.current.scrollTop;
      let hit = null;
      nodes.forEach(n => {
        if (mx >= n.x + 10 && mx <= n.x + 180 && my >= n.y + 10 && my <= n.y + 45) hit = n.id;
      });
      if (hit) {
        if (dragChain.nodeIds.length > 1 && dragChain.nodeIds[dragChain.nodeIds.length - 2] === hit) setDragChain(p => ({ ...p, nodeIds: p.nodeIds.slice(0, -1), mouseX: mx, mouseY: my }));
        else if (!dragChain.nodeIds.includes(hit)) setDragChain(p => ({ ...p, nodeIds: [...p.nodeIds, hit], mouseX: mx, mouseY: my }));
      } else setDragChain(p => ({ ...p, mouseX: mx, mouseY: my }));
    };

    const onUp = () => {
      if (dragChain?.nodeIds.length > 1) {
        const newData = { ...linkageData };
        const first = dragChain.nodeIds[0];
        for (let i = 0; i < dragChain.nodeIds.length - 1; i++) {
          const a = dragChain.nodeIds[i], b = dragChain.nodeIds[i+1];
          const src = isParallel ? (linkMode === 1 ? first : b) : (linkMode === 1 ? a : b);
          const tgt = isParallel ? (linkMode === 1 ? b : first) : (linkMode === 1 ? b : a);
          if (newData[src]) {
            newData[src].links_to = [...(newData[src].links_to || [])];
            if (!newData[src].links_to.includes(tgt)) newData[src].links_to.push(tgt);
          }
        }
        setLinkageData(newData);
      }
      setDragChain(null);
    };

    if (dragChain) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragChain, nodes, linkageData, linkMode, isParallel]);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'monospace', userSelect: 'none' }}>
      <Header onConfigOpen={handleSelectMaster} configLoaded={!!rootHandle} onFolderOpen={handleAddNewVault} selectedFile={selectedFileName} vaults={vaults} onSwitchVault={loadFiles} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar 
          fileHandles={fileHandles} 
          selectedFileName={selectedFileName} 
          onFileSelect={handleFileSelect} 
          linkMode={linkMode} setLinkMode={setLinkMode} 
          isParallel={isParallel} setIsParallel={setIsParallel} 
          onSave={handleSave} 
        />
        <GraphViewport 
          viewportRef={viewportRef} nodes={nodes} edges={edges} 
          dragChain={dragChain} onNodeMouseDown={onNodeMouseDown} 
          colorMap={colorMap} rankStrokeMap={rankStrokeMap} 
        />
      </div>
    </div>
  );
}

export default App;