export const calculateLayout = (db, orientation = 'horizontal') => {
  if (!db || typeof db !== 'object') return { nodes: [], edges: [] };
  const allIds = Object.keys(db);
  if (allIds.length === 0) return { nodes: [], edges: [] };

  const targetedIds = new Set(Object.values(db).flatMap(info => Object.keys(info.links_to || {})));
  const filteredBase = allIds
    .map(id => ({ id, ...db[id] }))
    .filter(node => !(node.rank === 0 && targetedIds.has(node.id)));
  const validIds = new Set(filteredBase.map(n => n.id));
const indegree = {};
allIds.forEach(id => indegree[id] = 0);

allIds.forEach(id => {
  Object.keys(db[id]?.links_to || {}).forEach(child => {
    if (indegree[child] !== undefined) {
      indegree[child]++;
    }
  });
});

const roots = filteredBase.filter(n => indegree[n.id] === 0);

  const nodeCoords = {};
  const occupiedSlots = {};

  const isSlotOccupied = (lvl, row) => occupiedSlots[lvl]?.has(row);
  const bookSlot = (lvl, row) => {
    if (!occupiedSlots[lvl]) occupiedSlots[lvl] = new Set();
    occupiedSlots[lvl].add(row);
  };

  const layoutBranch = (nodeId, level, startRow, visited = new Set()) => {
      if (nodeCoords[nodeId] || visited.has(nodeId)) return 0;
      visited.add(nodeId);

      const children = Object.keys(db[nodeId]?.links_to || {}).filter(cid => validIds.has(cid));
      let totalSlotsUsed = 0;
      let childrenPosSum = 0;

      children.forEach(childId => {
        const slots = layoutBranch(childId, level + 1, startRow + totalSlotsUsed, new Set(visited));
        totalSlotsUsed += slots;
        if (nodeCoords[childId]) {
          // Lấy tọa độ trục "phụ" để tính Gravity
          childrenPosSum += (orientation === 'vertical' ? nodeCoords[childId].x : nodeCoords[childId].y);
        }
      });

      // --- ĐIỀU CHỈNH KÍCH THƯỚC SLOT THEO HƯỚNG ---
      const slotSize = orientation === 'vertical' ? 210 : 110; // Chiều ngang note (190) + gap (20)
      const offset = orientation === 'vertical' ? 50 : 80;

      let idealPos = children.length > 0 ? childrenPosSum / children.length : startRow * slotSize + offset;
      let targetRow = Math.round((idealPos - offset) / slotSize);
      
      while (isSlotOccupied(level, targetRow)) { targetRow++; }
      bookSlot(level, targetRow);
      
      const finalRowPos = targetRow * slotSize + offset;

      if (orientation === 'vertical') {
        // View dọc: X giãn theo slotSize (210), Y giãn theo level (180)
        nodeCoords[nodeId] = { 
          x: finalRowPos, 
          y: level * 120 + 80 
        };
      } else {
        // View ngang: X giãn theo level (280), Y giãn theo slotSize (110)
        nodeCoords[nodeId] = { 
          x: level * 280 + 50, 
          y: finalRowPos 
        };
      }

      return Math.max(totalSlotsUsed, 1);
    };

  let globalRowCounter = 0;
  roots.forEach(root => { globalRowCounter += layoutBranch(root.id, 0, globalRowCounter); });

  const finalNodes = filteredBase.map(node => ({
    ...node,
    displayName: (node.name || node.id).replace(/\[\[(?:.*\|)?(.*)\]\]/, '$1'),
    ...nodeCoords[node.id]
  }));

  const nodeMap = Object.fromEntries(finalNodes.map(n => [n.id, n]));
  const edges = finalNodes.flatMap(source =>
    Object.keys(source.links_to || {})
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