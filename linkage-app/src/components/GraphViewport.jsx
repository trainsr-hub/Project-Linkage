import React from 'react';

// Hàm helper chuyển đổi rank sang số La Mã
const getRomanRank = (rank) => {
  const romanMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  return romanMap[rank] || '';
};

const GraphViewport = ({ 
  viewportRef, 
  nodes, 
  edges, 
  dragChain, 
  sliceLine,
  editingNodeId,
  multiSelectedIds = [], 
  onNodeMouseDown, 
  onNodeContextMenu,
  onViewportMouseDown, 
  onViewportDoubleClick, 
  colorMap, 
  rankStrokeMap 
}) => {
  return (
    <div 
      ref={viewportRef} 
      onContextMenu={(e) => e.preventDefault()} 
      onMouseDown={onViewportMouseDown}
      onDoubleClick={(e) => {
        const rect = viewportRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + viewportRef.current.scrollLeft;
        const y = e.clientY - rect.top + viewportRef.current.scrollTop;

        const hitNode = nodes.find(n => 
          x >= n.x && x <= n.x + 190 && 
          y >= n.y && y <= n.y + 55
        );

        if (!hitNode) {
          onViewportDoubleClick(x, y);
        }
      }}
      style={{ 
        flex: 1, position: 'relative', overflow: 'auto', 
        backgroundColor: '#050505', 
        cursor: sliceLine ? 'crosshair' : 'default' 
      }}
    >
      <div style={{ position: 'absolute', width: '4000px', height: '4000px', backgroundImage: 'radial-gradient(#222 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.5 }} />
      
      <svg style={{ position: 'absolute', width: '4000px', height: '4000px', top: 0, left: 0, pointerEvents: 'none' }}>
        {edges.map((edge, i) => (
          <line key={i} x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} stroke="#ffffff22" strokeWidth="1" />
        ))}

        {dragChain && dragChain.nodeIds.map((id, idx) => {
          const currentNode = nodes.find(n => n.id === id);
          if (!currentNode) return null;
          const startX = currentNode.x + 95, startY = currentNode.y + 27.5;
          if (idx === dragChain.nodeIds.length - 1) return <line key={"dc-"+id} x1={startX} y1={startY} x2={dragChain.mouseX} y2={dragChain.mouseY} stroke="#00ffff" strokeWidth="2" strokeDasharray="4" />;
          const nextNode = nodes.find(n => n.id === dragChain.nodeIds[idx + 1]);
          return <line key={"dc-l-"+id} x1={startX} y1={startY} x2={nextNode.x + 95} y2={nextNode.y + 27.5} stroke="#00ffff" strokeWidth="2.5" />;
        })}

        {sliceLine && (
          sliceLine.isSelectMode ? (
            sliceLine.nodeIds?.map((id, idx) => {
              const currentNode = nodes.find(n => n.id === id);
              if (!currentNode) return null;
              const startX = currentNode.x + 95, startY = currentNode.y + 27.5;
              if (idx === sliceLine.nodeIds.length - 1) {
                return <line key={"sl-last-"+id} x1={startX} y1={startY} x2={sliceLine.endX} y2={sliceLine.endY} stroke="#ff00ff" strokeWidth="2" strokeDasharray="4" style={{ filter: 'drop-shadow(0 0 5px #ff00ff)' }} />;
              }
              const nextNode = nodes.find(n => n.id === sliceLine.nodeIds[idx + 1]);
              return <line key={"sl-link-"+id} x1={startX} y1={startY} x2={nextNode.x + 95} y2={nextNode.y + 27.5} stroke="#ff00ff" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 5px #ff00ff)' }} />;
            })
          ) : (
            <line 
              x1={sliceLine.startX} y1={sliceLine.startY} 
              x2={sliceLine.endX} y2={sliceLine.endY} 
              stroke="#ff3333" strokeWidth="2" strokeDasharray="5,5" 
              style={{ filter: 'drop-shadow(0 0 5px #ff0000)' }} 
            />
          )
        )}
      </svg>

      {nodes.map((node) => {
        const isInChain = dragChain?.nodeIds.includes(node.id);
        const isEditing = editingNodeId === node.id;
        const isMultiSelected = multiSelectedIds.includes(node.id);

// ... Trong nodes.map((node) => { ...

      return (
        <div 
          key={node.id} 
          onMouseDown={(e) => {
            e.stopPropagation(); 
            onNodeMouseDown(e, node.id);
          }}
          style={{ 
            position: 'absolute', left: node.x, top: node.y, width: '190px', height: '55px', 
            backgroundColor: colorMap[node.color], 
            color: (node.color === 'G' || node.color === 'Y') ? '#000' : '#fff', 
            border: (isEditing || isMultiSelected) 
              ? '3px solid #ff00ff' 
              : `${node.rank > 0 ? '3px' : '1px'} solid ${isInChain ? '#00ffff' : rankStrokeMap[node.rank] || 'transparent'}`, 
            borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', zIndex: 10, 
            boxShadow: (isEditing || isMultiSelected) 
              ? '0 0 20px #ff00ff' 
              : (isInChain ? '0 0 15px #00ffff' : '0 4px 10px rgba(0,0,0,0.5)'), 
            cursor: 'crosshair',
            transition: 'transform 0.1s, box-shadow 0.1s',
            whiteSpace: 'pre-wrap', // Quan trọng: Để nhận diện \n
            lineHeight: '1.2'
          }}
        >
          {/* Tên hiển thị */}
          {node.displayName}

          {/* Rank - Số La Mã ở góc DƯỚI bên phải */}
          {node.rank > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '4px', // Thay đổi từ top sang bottom
              right: '8px',
              fontSize: '10px',
              fontFamily: '"Times New Roman", serif',
              opacity: 0.8,
              pointerEvents: 'none',
              lineHeight: '1' // Đảm bảo không bị đẩy dòng
            }}>
              {getRomanRank(node.rank)}
            </div>
          )}
        </div>
      );
      })}
    </div>
  );
};

export default GraphViewport;