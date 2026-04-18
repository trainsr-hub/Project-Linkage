import { useState, useCallback } from 'react';

export function useGraphLogic() {
  const [linkageData, setLinkageData] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);

  // --- HÀM BỔ TRỢ (Private) ---
  const getNextNodeName = (sourceName, allData) => {
    if (!sourceName) return "New Node";
    const match = sourceName.match(/(.*?)(\d+)$/);
    let prefix = sourceName, startNum = 0, padLen = 0;
    if (match) {
      prefix = match[1];
      startNum = parseInt(match[2], 10);
      padLen = match[2].length;
    }
    const existingNames = Object.values(allData || {}).map(n => n.name);
    let nextNum = startNum + 1;
    while (true) {
      const numStr = padLen > 0 ? nextNum.toString().padStart(padLen, '0') : nextNum.toString();
      const finalName = prefix + numStr;
      if (!existingNames.includes(finalName)) return finalName;
      nextNum++;
    }
  };

  // --- ACTIONS CHÍNH ---
  const updateDataWithHistory = useCallback((newData) => {
    if (JSON.stringify(newData) === JSON.stringify(linkageData)) return;
    setHistoryStack(prev => [...prev, JSON.stringify(linkageData)].slice(-30));
    setLinkageData(newData);
  }, [linkageData]);

  const undo = useCallback(() => {
    if (historyStack.length === 0) return;
    setHistoryStack(prev => {
      const newStack = [...prev];
      const lastState = JSON.parse(newStack.pop());
      setLinkageData(lastState);
      return newStack;
    });
  }, [historyStack]);

  const createNode = useCallback((x, y) => {
    const newId = `node_${Date.now()}`;
    const newData = { ...linkageData, [newId]: { name: "New Node", color: "B", rank: 2, links_to: [] } };
    updateDataWithHistory(newData);
    return newId; // Trả về ID để App biết mà Focus/Edit
  }, [linkageData, updateDataWithHistory]);

  const updateNode = useCallback((id, field, value) => {
    const newData = { ...linkageData, [id]: { ...linkageData[id], [field]: value } };
    updateDataWithHistory(newData);
  }, [linkageData, updateDataWithHistory]);

  const deleteNodes = useCallback((ids) => {
    if (!linkageData || ids.length === 0) return;
    const newData = { ...linkageData };
    ids.forEach(id => delete newData[id]);
    updateDataWithHistory(newData);
  }, [linkageData, updateDataWithHistory]);

  const rebornNode = useCallback((sourceId, linkMode) => {
    const sourceNode = linkageData[sourceId];
    if (!sourceNode) return null;
    
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
    if (linkMode === 1) newData[sourceId].links_to = [...(newData[sourceId].links_to || []), newId];
    else newData[newId].links_to = [sourceId];
    
    updateDataWithHistory(newData);
    return newId;
  }, [linkageData, updateDataWithHistory]);

  return {
    linkageData, setLinkageData, setHistoryStack,
    undo, createNode, updateNode, deleteNodes, rebornNode
  };
}