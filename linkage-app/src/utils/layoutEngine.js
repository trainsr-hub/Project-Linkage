/**
 * layoutEngine.js
 * Chứa logic render nguyên bản (Duyệt nhánh đệ quy và tính trung bình Y)
 */

export const calculateLayout = (db) => {
  if (!db || typeof db !== 'object') return { nodes: [], edges: [] };
  
  const allIds = Object.keys(db);
  if (allIds.length === 0) return { nodes: [], edges: [] };

  // 1. Tiền xử lý dữ liệu
  const targetedIds = new Set(Object.values(db).flatMap(info => info.links_to || []));
  
  // Lọc bỏ các node rank 0 bị trỏ tới (theo logic cũ của bạn)
  const filteredBase = allIds
    .map(id => ({ id, ...db[id] }))
    .filter(node => !(node.rank === 0 && targetedIds.has(node.id)));
  
  const validIds = new Set(filteredBase.map(n => n.id));
  
  // Xác định các node Gốc (không bị ai trong filteredBase trỏ tới)
  const roots = filteredBase.filter(n => 
    !filteredBase.some(other => other.links_to?.includes(n.id))
  );

  const nodeCoords = {}; 
  let currentGlobalRow = 0;

  // 2. Logic Layout đệ quy (Gốc của bạn)
  const layoutBranch = (nodeId, level, startRow, visited = new Set()) => {
    if (nodeCoords[nodeId] || visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const children = db[nodeId]?.links_to?.filter(cid => validIds.has(cid)) || [];
    
    // Nếu là Leaf (không con)
    if (children.length === 0) { 
      nodeCoords[nodeId] = { 
        x: level * 280 + 50, 
        y: startRow * 110 + 80 
      }; 
      return 1; 
    }

    // Nếu có con, tính toán slot và trung tâm Y
    let totalSlotsUsed = 0; 
    let childrenYSum = 0;

    children.forEach(childId => {
      const slots = layoutBranch(childId, level + 1, startRow + totalSlotsUsed, new Set(visited));
      totalSlotsUsed += slots;
      if (nodeCoords[childId]) childrenYSum += nodeCoords[childId].y;
    });

    // Căn giữa node cha theo các node con
    nodeCoords[nodeId] = { 
      x: level * 280 + 50, 
      y: childrenYSum / (children.length || 1) 
    };

    return totalSlotsUsed;
  };

  // Thực hiện layout cho từng cụm Root
  roots.forEach(root => { 
    currentGlobalRow += layoutBranch(root.id, 0, currentGlobalRow); 
  });

  // Xử lý các node mồ côi (không nằm trong luồng đệ quy)
  filteredBase.forEach(n => { 
    if (!nodeCoords[n.id]) { 
      nodeCoords[n.id] = { x: 0, y: currentGlobalRow * 110 + 80 }; 
      currentGlobalRow++; 
    } 
  });

  // 3. Chuẩn hóa dữ liệu trả về cho Component
  const finalNodes = filteredBase.map(node => {
    let displayName = String(node.name || "");
    const match = displayName.match(/\[\[(?:.*\|)?(.*)\]\]/);
    return { 
      ...node, 
      displayName: match ? match[1] : displayName, 
      ...nodeCoords[node.id] 
    };
  });

  const nodeMap = Object.fromEntries(finalNodes.map(n => [n.id, n]));
  
  const edges = finalNodes.flatMap(source => 
    (source.links_to || [])
      .filter(tid => nodeMap[tid])
      .map(tid => ({ 
        fromX: source.x + 95, 
        fromY: source.y + 27.5, 
        toX: nodeMap[tid].x + 95, 
        toY: nodeMap[tid].y + 27.5 
      }))
  );

  return { nodes: finalNodes, edges };
};