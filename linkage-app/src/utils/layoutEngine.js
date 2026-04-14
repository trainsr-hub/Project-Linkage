export const calculateLayout = (db) => {
  if (!db || typeof db !== 'object') return { nodes: [], edges: [] };
  const allIds = Object.keys(db);
  if (allIds.length === 0) return { nodes: [], edges: [] };

  const targetedIds = new Set(Object.values(db).flatMap(info => info.links_to || []));
  const filteredBase = allIds
    .map(id => ({ id, ...db[id] }))
    .filter(node => !(node.rank === 0 && targetedIds.has(node.id)));
  const validIds = new Set(filteredBase.map(n => n.id));
  const roots = filteredBase.filter(n => !filteredBase.some(other => other.links_to?.includes(n.id)));

  const nodeCoords = {};
  const occupiedSlots = {}; // Cấu trúc: { [level]: Set(row_index) }

  const isSlotOccupied = (lvl, row) => {
    if (!occupiedSlots[lvl]) return false;
    // Kiểm tra xem hàng này hoặc các hàng lân cận (để dãn cách) có ai chưa
    return occupiedSlots[lvl].has(row);
  };

  const bookSlot = (lvl, row) => {
    if (!occupiedSlots[lvl]) occupiedSlots[lvl] = new Set();
    occupiedSlots[lvl].add(row);
  };

  const layoutBranch = (nodeId, level, startRow, visited = new Set()) => {
    if (nodeCoords[nodeId] || visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const children = db[nodeId]?.links_to?.filter(cid => validIds.has(cid)) || [];
    let totalSlotsUsed = 0;
    let childrenYSum = 0;

    // 1. Đi sâu xuống các con trước để lấy neo tọa độ
    children.forEach(childId => {
      const slots = layoutBranch(childId, level + 1, startRow + totalSlotsUsed, new Set(visited));
      totalSlotsUsed += slots;
      if (nodeCoords[childId]) childrenYSum += nodeCoords[childId].y;
    });

    // 2. Tính Y lý tưởng (Gravity)
    let idealY = children.length > 0 
      ? childrenYSum / children.length 
      : startRow * 110 + 80;

    // 3. Xử lý va chạm Peer (Ép vào Slot hàng nguyên bản)
    let targetRow = Math.round((idealY - 80) / 110);
    
    // Nếu hàng này bị Peer khác "ăn" mất rồi, tìm hàng trống tiếp theo bên dưới
    while (isSlotOccupied(level, targetRow)) {
      targetRow++; // Dãn cách ra 1 block
    }

    // Đặt cọc slot
    bookSlot(level, targetRow);
    const finalY = targetRow * 110 + 80;

    nodeCoords[nodeId] = { x: level * 280 + 50, y: finalY };

    return Math.max(totalSlotsUsed, 1);
  };

  let globalRowCounter = 0;
  roots.forEach(root => {
    globalRowCounter += layoutBranch(root.id, 0, globalRowCounter);
  });

  // Xử lý node mồ côi
  filteredBase.forEach(n => {
    if (!nodeCoords[n.id]) {
      let r = 0;
      while (isSlotOccupied(0, r)) r++;
      bookSlot(0, r);
      nodeCoords[n.id] = { x: 50, y: r * 110 + 80 };
    }
  });

  // --- TRẢ VỀ DATA (Giữ nguyên) ---
  const finalNodes = filteredBase.map(node => ({
    ...node,
    displayName: (node.name || node.id).replace(/\[\[(?:.*\|)?(.*)\]\]/, '$1'),
    ...nodeCoords[node.id]
  }));

  const nodeMap = Object.fromEntries(finalNodes.map(n => [n.id, n]));
  const edges = finalNodes.flatMap(source => 
    (source.links_to || []).filter(tid => nodeMap[tid]).map(tid => ({
      fromX: source.x + 95, fromY: source.y + 27.5,
      toX: nodeMap[tid].x + 95, toY: nodeMap[tid].y + 27.5
    }))
  );

  return { nodes: finalNodes, edges };
};