// src/utils/layoutEngine.js

export const calculateLayout = (db, orientation = 'horizontal', NODE_SIZE) => {
  if (!db || typeof db !== 'object') return { nodes: [], edges: [] };
  const allIds = Object.keys(db);
  if (allIds.length === 0) return { nodes: [], edges: [] };

  const W = NODE_SIZE?.w ?? 190;
  const H = NODE_SIZE?.h ?? 55;
  const CX = NODE_SIZE?.cx ?? W / 2;
  const CY = NODE_SIZE?.cy ?? H / 2;
  const k = 0.00628;

  const normalize = (x, y) => {
    const x_post = 1 / (1 + Math.exp(k * (x - y)));
    return { x_post, y_post: 1 - x_post };
  };

  // W = x, H = y
  const { x_post, y_post } = normalize(W, H);
  // GAP phân bổ theo tỷ lệ
  const GAP_X = Math.round(W * x_post);
  const GAP_Y = Math.round(H * y_post);

  const targetedIds = new Set(
    Object.values(db).flatMap(info => Object.keys(info.links_to || {}))
  );

  const filteredBase = allIds
    .map(id => ({ id, ...db[id] }))
    .filter(node => !(node.rank === 0 && targetedIds.has(node.id)));

  const validIds = new Set(filteredBase.map(n => n.id));

  const indegree = {};
  allIds.forEach(id => indegree[id] = 0);

  allIds.forEach(id => {
    Object.keys(db[id]?.links_to || {}).forEach(child => {
      if (indegree[child] !== undefined) indegree[child]++;
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
        childrenPosSum += (orientation === 'vertical'
          ? nodeCoords[childId].x
          : nodeCoords[childId].y);
      }
    });

    // SLOT SIZE FIX (KHÔNG CÒN HARD CODE)
    const slotSize = orientation === 'vertical'
      ? (W + GAP_X)
      : (H + GAP_Y);

    const offset = orientation === 'vertical' ? GAP_X : GAP_Y;

    let idealPos =
      children.length > 0
        ? childrenPosSum / children.length
        : startRow * slotSize + offset;

    let targetRow = Math.round((idealPos - offset) / slotSize);

    while (isSlotOccupied(level, targetRow)) targetRow++;
    bookSlot(level, targetRow);

    const finalRowPos = targetRow * slotSize + offset;

    if (orientation === 'vertical') {
      nodeCoords[nodeId] = {
        x: finalRowPos,
        y: level * (H + GAP_Y) + GAP_Y
      };
    } else {
      nodeCoords[nodeId] = {
        x: level * (W + GAP_X) + GAP_X,
        y: finalRowPos
      };
    }

    return Math.max(totalSlotsUsed, 1);
  };

  let globalRowCounter = 0;
  roots.forEach(root => {
    globalRowCounter += layoutBranch(root.id, 0, globalRowCounter);
  });

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
        fromX: source.x + CX,
        fromY: source.y + CY,
        toX: nodeMap[tid].x + CX,
        toY: nodeMap[tid].y + CY
      }))
  );

  return { nodes: finalNodes, edges };
};