import React, { useState, useMemo, useRef, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import Sidebar from './components/Sidebar';
import GraphViewport from './components/GraphViewport';
import Header from './components/Header';
import { parseLinkageFile, composeLinkageFile } from './utils/fileProcessor';
import { calculateLayout } from './utils/layoutEngine';

// ... (Hàm checkIntersection giữ nguyên)
function checkIntersection(p1, p2, p3, p4) {
  const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
  if (det === 0) return false;
  const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
  const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}

function App() {
  // --- STATES (Giữ nguyên các state cũ) ---
  const [rootHandle, setRootHandle] = useState(null);
  const [vaults, setVaults] = useState([]); 
  const [fileHandles, setFileHandles] = useState([]);
  const [linkageData, setLinkageData] = useState(null); 
  const [historyStack, setHistoryStack] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [activeFileHandle, setActiveFileHandle] = useState(null);
  const [showToast, setShowToast] = useState(false); 
  const [previewImage, setPreviewImage] = useState(null);

  const [dragChain, setDragChain] = useState(null);
  const [sliceLine, setSliceLine] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null); 
  const [multiSelectedIds, setMultiSelectedIds] = useState([]);

  const [linkMode, setLinkMode] = useState(1); 
  const [isParallel, setIsParallel] = useState(false); 
  const [writingMode, setWritingMode] = useState(true); 
  const [isInversionView, setIsInversionView] = useState(false);
  const [orientation, setOrientation] = useState('horizontal');

  // Hàm này để đổi qua lại giữa 'horizontal' và 'vertical'
  const handleToggleOrientation = () => {
    setOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
  };

  const viewportRef = useRef(null);
  const colorMap = { 'P': '#7d56f5', 'G': '#2ecc71', 'B': '#3498db', 'Y': '#f1c40f', 'W':'#ffffff' };
  const rankStrokeMap = { 1: '#000000', 2: '#ffffff', 3: '#0000FF', 4: '#FFD700' };

  // --- LOGIC TỰ ĐỘNG TĂNG TÊN (Bản cập nhật chống trùng bồ đã dùng) ---
  const getNextNodeName = (sourceName, allData) => {
    if (!sourceName) return "New Node";
    const safeData = allData || {};
    const match = sourceName.match(/(.*?)(\d+)$/);
    let prefix = sourceName;
    let startNum = 0;
    let padLen = 0;

    if (match) {
      prefix = match[1];
      startNum = parseInt(match[2], 10);
      padLen = match[2].length;
    }

    const existingNames = Object.values(safeData).map(n => n.name);
    let nextNum = startNum + 1;
    let finalName = "";

    while (true) {
      const numStr = padLen > 0 ? nextNum.toString().padStart(padLen, '0') : nextNum.toString();
      finalName = prefix + numStr;
      if (!existingNames.includes(finalName)) break;
      nextNum++;
    }
    return finalName;
  };

  // --- TÍNH TOÁN LAYOUT ---
  const { nodes, edges } = useMemo(() => {
      if (!linkageData) return { nodes: [], edges: [] };

      let processedData = linkageData;

      if (isInversionView) {
        const invertedData = {};
        Object.keys(linkageData).forEach(id => {
          invertedData[id] = { ...linkageData[id], links_to: [] };
        });
        Object.keys(linkageData).forEach(srcId => {
          (linkageData[srcId].links_to || []).forEach(tgtId => {
            if (invertedData[tgtId]) {
              invertedData[tgtId].links_to.push(srcId);
            }
          });
        });
        processedData = invertedData;
      }

      // CHỖ THAY ĐỔI: Truyền thêm orientation vào đây
      return calculateLayout(processedData, orientation); 
      
    }, [linkageData, isInversionView, orientation]); // CHỖ THAY ĐỔI: Thêm orientation vào dependency


  
  // --- HANDLERS (Giữ nguyên logic chính) ---
  const toggleInversionView = () => {
    const next = !isInversionView;
    setIsInversionView(next);
    setLinkMode(next ? 2 : 1);
  };

  const updateLinkageDataWithHistory = (newData) => {
    if (JSON.stringify(newData) === JSON.stringify(linkageData)) return;
    setHistoryStack(prev => [...prev, JSON.stringify(linkageData)].slice(-30));
    setLinkageData(newData);
  };

  const undo = () => {
    if (historyStack.length === 0) return;
    setHistoryStack(prev => {
      const newStack = [...prev];
      const lastState = JSON.parse(newStack.pop());
      setLinkageData(lastState);
      return newStack;
    });
    setEditingNodeId(null);
    setMultiSelectedIds([]);
  };

  // ... (Các hàm useEffect, setupProject, loadFiles, handleFileSelect, handleSave giữ nguyên)
  useEffect(() => {
    const init = async () => {
      const savedRoot = await get('master_root_handle');
      if (savedRoot && (await savedRoot.queryPermission({ mode: 'readwrite' })) === 'granted') setupProject(savedRoot);
    };
    init();
  }, []);

  useEffect(() => {
    const handleReborn = (e) => {
      if (!writingMode) return; 
      const { sourceId } = e.detail;
      const sourceNode = linkageData[sourceId];
      if (!sourceNode) return;
      const newId = `node_${Date.now()}`;
      const newNode = { 
        name: getNextNodeName(sourceNode.name, linkageData), 
        color: sourceNode.color, 
        rank: sourceNode.rank, 
        image: sourceNode.image || "",
        links_to: [] 
      };
      const newData = { ...linkageData };
      newData[newId] = newNode;
      if (linkMode === 1) {
        newData[sourceId].links_to = [...(newData[sourceId].links_to || []), newId];
      } else {
        newData[newId].links_to = [sourceId];
      }
      updateLinkageDataWithHistory(newData);
      setEditingNodeId(newId);
      setMultiSelectedIds([newId]);
    };
    window.addEventListener('reborn-node', handleReborn);
    return () => window.removeEventListener('reborn-node', handleReborn);
  }, [linkageData, writingMode, linkMode]);

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
    if (res.success) {
      setLinkageData(res.parsedData);
      setHistoryStack([]); 
      setEditingNodeId(null);
      setMultiSelectedIds([]);
    }
  };


  const handleAddVault = async () => {
    if (!rootHandle) return;
    try {
      const newVaultHandle = await window.showDirectoryPicker();
      const relativePath = await rootHandle.resolve(newVaultHandle); // Tự động lấy mảng path chuẩn

      if (!relativePath) return alert("Vault phải nằm trong Master Folder!");

      // Đọc & Cập nhật Vault.json
      const dataDir = await rootHandle.getDirectoryHandle('data');
      const fileHandle = await dataDir.getFileHandle('Vault.json');
      const config = JSON.parse(await (await fileHandle.getFile()).text() || '{"vaults":[]}');

      const newEntry = { name: newVaultHandle.name, path: relativePath };
      if (config.vaults.some(v => v.name === newEntry.name)) return alert("Trùng tên!");

      config.vaults.push(newEntry);

      // Ghi file
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(config, null, 2));
      await writable.close();

      // Cập nhật UI
      setVaults(prev => [...prev, newVaultHandle]);
      loadFiles(newVaultHandle);
    } catch (e) { console.error(e); }
  };


  const handleSave = async () => {
    if (!activeFileHandle || !linkageData) return;
    try {
      const content = await (await activeFileHandle.getFile()).text();
      const { part1, part3, success } = parseLinkageFile(content);
      if (!success) return;
      const writable = await activeFileHandle.createWritable();
      await writable.write(composeLinkageFile(part1, linkageData, part3));
      await writable.close();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) { console.error("Lưu thất bại:", err); }
  };

  const handleCreateNode = (x, y) => {
    const newId = `node_${Date.now()}`;
    const newData = { ...linkageData, [newId]: { name: "New Node", color: "B", rank: 2, links_to: [] } };
    updateLinkageDataWithHistory(newData);
    setEditingNodeId(newId);
    setMultiSelectedIds([newId]);
  };

  const handleUpdateNode = (id, field, value) => {
    const newData = { ...linkageData, [id]: { ...linkageData[id], [field]: value } };
    updateLinkageDataWithHistory(newData);
  };

  const handleDeleteNode = (id) => {
    if (!linkageData) return;
    const newData = { ...linkageData };
    const targets = multiSelectedIds.length > 0 ? multiSelectedIds : (id ? [id] : []);
    if (targets.length === 0) return;
    targets.forEach(tId => delete newData[tId]);
    updateLinkageDataWithHistory(newData);
    setEditingNodeId(null);
    setMultiSelectedIds([]);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (editingNodeId || multiSelectedIds.length > 0) && !isTyping) { handleDeleteNode(editingNodeId); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingNodeId, multiSelectedIds, linkageData, historyStack, activeFileHandle]);

  const onNodeMouseDown = (e, id) => {
    const rect = viewportRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + viewportRef.current.scrollLeft;
    const y = e.clientY - rect.top + viewportRef.current.scrollTop;
    if (e.button === 0) {
      setDragChain({ nodeIds: [id], mouseX: x, mouseY: y });
    } else if (e.button === 2) {
      setSliceLine({ startX: x, startY: y, endX: x, endY: y, isSelectMode: true, nodeIds: [id] });
      setMultiSelectedIds([id]);
      setEditingNodeId(id);
    }
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left + viewportRef.current.scrollLeft;
      const my = e.clientY - rect.top + viewportRef.current.scrollTop;
      if (dragChain || (sliceLine && sliceLine.isSelectMode)) {
        let hit = null;
        nodes.forEach(n => { if (mx >= n.x + 10 && mx <= n.x + 180 && my >= n.y + 10 && my <= n.y + 45) hit = n.id; });
        if (dragChain) {
          if (hit) {
            if (dragChain.nodeIds.length > 1 && dragChain.nodeIds[dragChain.nodeIds.length - 2] === hit) setDragChain(p => ({ ...p, nodeIds: p.nodeIds.slice(0, -1), mouseX: mx, mouseY: my }));
            else if (!dragChain.nodeIds.includes(hit)) setDragChain(p => ({ ...p, nodeIds: [...p.nodeIds, hit], mouseX: mx, mouseY: my }));
          } else setDragChain(p => ({ ...p, mouseX: mx, mouseY: my }));
        } else if (sliceLine && sliceLine.isSelectMode) {
          if (hit) {
            const currentIds = sliceLine.nodeIds || [];
            if (currentIds.length > 1 && currentIds[currentIds.length - 2] === hit) {
               const newIds = currentIds.slice(0, -1);
               setSliceLine(p => ({ ...p, nodeIds: newIds, endX: mx, endY: my }));
               setMultiSelectedIds(newIds);
               setEditingNodeId(hit);
            } else if (!currentIds.includes(hit)) {
               const newIds = [...currentIds, hit];
               setSliceLine(p => ({ ...p, nodeIds: newIds, endX: mx, endY: my }));
               setMultiSelectedIds(newIds);
               setEditingNodeId(hit);
            }
          } else setSliceLine(p => ({ ...p, endX: mx, endY: my }));
        }
      } else if (sliceLine) {
        setSliceLine(prev => ({ ...prev, endX: mx, endY: my }));
      }
    };

    const onUp = () => {
      if (dragChain) {
        const chain = dragChain.nodeIds;
        const mx = dragChain.mouseX;
        const my = dragChain.mouseY;
        let hitNodeId = null;
        nodes.forEach(n => { if (mx >= n.x && mx <= n.x + 190 && my >= n.y && my <= n.y + 55) hitNodeId = n.id; });
        const sourceId = chain[0];
        if (!hitNodeId && editingNodeId === sourceId && chain.length === 1) {
          const sourceNode = linkageData[sourceId];
          const newId = `node_${Date.now()}`;
          const newNode = { 
            name: getNextNodeName(sourceNode.name, linkageData), 
            color: sourceNode.color, 
            rank: sourceNode.rank, 
            image: sourceNode.image || "",
            links_to: [] 
          };
          const newData = { ...linkageData };
          newData[newId] = newNode;
          if (linkMode === 1) {
            newData[sourceId].links_to = [...(newData[sourceId].links_to || []), newId];
          } else {
            newData[newId].links_to = [sourceId];
          }
          updateLinkageDataWithHistory(newData);
          setEditingNodeId(newId); 
          setMultiSelectedIds([newId]);
        } 
        else if (chain.length > 1 || (chain.length === 1 && hitNodeId)) {
          const finalChain = (chain.length === 1 && hitNodeId) ? [chain[0], hitNodeId] : chain;
          const finalData = JSON.parse(JSON.stringify(linkageData)); 
          const draftData = JSON.parse(JSON.stringify(linkageData)); 
          const pendingLinks = [];
          for (let i = 0; i < finalChain.length - 1; i++) {
            const a = finalChain[i], b = finalChain[i + 1];
            const src = isParallel ? (linkMode === 1 ? finalChain[0] : b) : (linkMode === 1 ? a : b);
            const tgt = isParallel ? (linkMode === 1 ? b : finalChain[0]) : (linkMode === 1 ? b : a);
            pendingLinks.push({ src, tgt });
            if (draftData[src]) draftData[src].links_to = [...(draftData[src].links_to || []), tgt];
          }
          const hasPath = (startId, targetId, currentData, visited = new Set()) => {
            if (startId === targetId) return true;
            if (visited.has(startId)) return false;
            visited.add(startId);
            return (currentData[startId]?.links_to || []).some(c => hasPath(c, targetId, currentData, visited));
          };
          let changed = false;
          pendingLinks.forEach(({ src, tgt }) => {
            if (hasPath(tgt, src, draftData) || hasPath(src, tgt, finalData)) return;
            Object.keys(finalData).forEach(pId => {
              if (finalData[pId].links_to?.includes(tgt) && hasPath(pId, src, finalData)) {
                finalData[pId].links_to = finalData[pId].links_to.filter(id => id !== tgt);
                changed = true;
              }
            });
            if (finalData[src]) {
              if (!finalData[src].links_to.includes(tgt)) {
                finalData[src].links_to.push(tgt);
                changed = true;
              }
            }
          });
          if (changed) updateLinkageDataWithHistory(finalData);
        }
      }
      if (sliceLine && !sliceLine.isSelectMode) {
        const { startX, startY, endX, endY } = sliceLine;
        const newData = JSON.parse(JSON.stringify(linkageData));
        let changed = false;
        Object.keys(newData).forEach(sourceId => {
          const sourceNode = nodes.find(n => n.id === sourceId);
          if (!sourceNode || !newData[sourceId].links_to) return;
          const remainingLinks = newData[sourceId].links_to.filter(targetId => {
            const targetNode = nodes.find(n => n.id === targetId);
            if (!targetNode) return true;
            const intersects = checkIntersection({ x: startX, y: startY }, { x: endX, y: endY }, { x: sourceNode.x + 95, y: sourceNode.y + 27.5 }, { x: targetNode.x + 95, y: targetNode.y + 27.5 });
            if (intersects) changed = true;
            return !intersects;
          });
          newData[sourceId].links_to = remainingLinks;
        });
        if (changed) updateLinkageDataWithHistory(newData);
      }
      setDragChain(null); setSliceLine(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragChain, sliceLine, nodes, linkageData, linkMode, isParallel, multiSelectedIds, writingMode, editingNodeId, isInversionView]);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'monospace', userSelect: 'none' }}>
      <Header onConfigOpen={() => window.showDirectoryPicker().then(h => { set('master_root_handle', h); setupProject(h); })} configLoaded={!!rootHandle} selectedFile={selectedFileName} vaults={vaults} onSwitchVault={loadFiles} onFolderOpen={handleAddVault}/>
      
{/* CHỖ NÀY LÀ CÁI LỒNG TỔNG: 
          Phải có width: 100% và overflow: hidden để Sidebar không bị trôi 
      */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden', 
        position: 'relative', 
        width: '100%' 
      }}>
        
        <Sidebar 
          fileHandles={fileHandles} 
          selectedFileName={selectedFileName} 
          onFileSelect={handleFileSelect} 
          linkMode={linkMode} 
          setLinkMode={setLinkMode} 
          isParallel={isParallel} 
          setIsParallel={setIsParallel} 
          writingMode={writingMode} 
          setWritingMode={setWritingMode} 
          isInversionView={isInversionView} 
          onToggleInversionView={toggleInversionView} 
          orientation={orientation} 
          onToggleOrientation={handleToggleOrientation}
          onSave={handleSave}
          editingNode={editingNodeId ? { id: editingNodeId, ...linkageData[editingNodeId] } : null} 
          onUpdateNode={handleUpdateNode} 
          onCloseEditor={() => {setEditingNodeId(null); setMultiSelectedIds([]);}} 
          onDeleteNode={handleDeleteNode}
        />
        
        {/* MŨI TÊN VÀO ĐÂY -> ĐÂY LÀ "CHÌA KHÓA" ĐỂ THOÁT TÙ 
            Thẻ div bọc GraphViewport BẮT BUỘC phải có flex: 1 và minWidth: 0
            Nếu thiếu minWidth: 0, Flexbox sẽ ép chết chiều rộng của GraphViewport bằng màn hình.
        */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          minWidth: 0, 
          position: 'relative',
          height: '100%'
        }}>
          <GraphViewport 
            viewportRef={viewportRef} 
            nodes={nodes} 
            edges={edges} 
            dragChain={dragChain} 
            sliceLine={sliceLine} 
            editingNodeId={editingNodeId} 
            multiSelectedIds={multiSelectedIds} 
            onNodeMouseDown={onNodeMouseDown} 
            onViewportDoubleClick={handleCreateNode}
            onOpenImage={setPreviewImage} 
            onViewportMouseDown={(e) => {
              const rect = viewportRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left + viewportRef.current.scrollLeft;
              const y = e.clientY - rect.top + viewportRef.current.scrollTop;
              if (e.button === 2) { 
                setSliceLine({ startX: x, startY: y, endX: x, endY: y, isSelectMode: false });
                setMultiSelectedIds([]);
              } else if (e.button === 0) { 
                const hitNode = nodes.find(n => x >= n.x && x <= n.x + 190 && y >= n.y && y <= n.y + 55);
                if (!hitNode) { setEditingNodeId(null); setMultiSelectedIds([]); }
              }
            }}
            colorMap={colorMap} 
            rankStrokeMap={rankStrokeMap} 
          />
        </div>
      </div>

      {showToast && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#00ff00', color: '#000', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', zIndex: 9999, boxShadow: '0 0 15px rgba(0, 255, 0, 0.5)' }}>
          💾 SAVED SUCCESSFULLY!
        </div>
      )}

      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)} 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={previewImage} 
            alt="Preview"
            style={{ maxWidth: '90%', maxHeight: '90%', boxShadow: '0 0 30px rgba(0,0,0,0.5)', borderRadius: '4px', objectFit: 'contain' }} 
          />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>✕</div>
        </div>
      )}
    </div>
  );
}

export default App;