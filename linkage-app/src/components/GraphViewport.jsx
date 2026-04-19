// GraphViewport.jsx

import React, { useMemo } from 'react'; // Thêm useMemo để tối ưu

// Hàm helper chuyển đổi rank sang số La Mã
const getRomanRank = (rank) => {
  const romanMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  return romanMap[rank] || '';
};

const GraphViewport = ({ 
  viewportRef, 
  nodeSize,
  nodes, 
  edges, 
  dragChain, 
  sliceLine,
  editingNodeId,
  multiSelectedIds = [], 
  onNodeMouseDown, 
  onViewportMouseDown, 
  onViewportDoubleClick, 
  onOpenImage, 
  colorMap, 
  rankStrokeMap 
}) => {

  // LOGIC GIÃN NỞ: Tự động tính toán chiều ngang (maxX) và chiều dọc (maxY)
  const { canvasWidth, canvasHeight } = useMemo(() => {
    // Nếu chưa có node nào, mặc định cho 3000px để làm việc
    if (nodes.length === 0) return { canvasWidth: 3000, canvasHeight: 3000 };

    // Tìm node nằm xa nhất bên phải và sâu nhất bên dưới
    const maxX = Math.max(...nodes.map(n => n.x)) + 1000; // Cộng thêm 1000px đệm để vẩy chuột
    const maxY = Math.max(...nodes.map(n => n.y)) + 1000;
    


    return {
      canvasWidth: Math.max(maxX, 10000), // Không bao giờ nhỏ hơn 4000px
      canvasHeight: Math.max(maxY, 4000)
    };
  }, [nodes]);

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
          x >= n.x && x <= n.x + nodeSize.w && 
          y >= n.y && y <= n.y + nodeSize.h
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
      {/* GRID NỀN: Sử dụng kích thước động canvasWidth/canvasHeight */}
      <div style={{ 
        position: 'absolute', 
        width: `${canvasWidth}px`, 
        height: `${canvasHeight}px`, 
        backgroundImage: 'radial-gradient(#222 1px, transparent 1px)', 
        backgroundSize: '30px 30px', 
        opacity: 0.5 
      }} />
      
      {/* SVG LAYER: Sử dụng kích thước động canvasWidth/canvasHeight */}
      <svg style={{ 
        position: 'absolute', 
        width: `${canvasWidth}px`, 
        height: `${canvasHeight}px`, 
        top: 0, left: 0, pointerEvents: 'none' 
      }}>
        {edges.map((edge, i) => (
          <line key={i} x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} stroke="#ffffff22" strokeWidth="1" />
        ))}
      {edges.map((edge, i) => {
        const from = nodes.find(n => n.x + nodeSize.cx === edge.fromX && n.y + nodeSize.cy === edge.fromY);
        const to = nodes.find(n => n.x + nodeSize.cx === edge.toX && n.y + nodeSize.cy === edge.toY);

        const label = from?.links_to?.[to?.id];

return typeof label === "string" ? (
  <text
    key={i}
    x={(edge.fromX + edge.toX) / 2}
    y={(edge.fromY + edge.toY) / 2 - 4}
    fill="#fff"
    fontSize={12}
    textAnchor="start"
    dominantBaseline="auto"
    pointerEvents="none"
  >
    {label.split("~").map((line, idx) => (
      <tspan key={idx} x={(edge.fromX + edge.toX) / 2} dy={idx === 0 ? 0 : 14}>
        {line}
      </tspan>
    ))}
  </text>
) : null;
      })}

        {dragChain && dragChain.nodeIds.map((id, idx) => {
          const currentNode = nodes.find(n => n.id === id);
          if (!currentNode) return null;
          const startX = currentNode.x + nodeSize.cx, startY = currentNode.y + nodeSize.cy;
          if (idx === dragChain.nodeIds.length - 1) return <line key={"dc-"+id} x1={startX} y1={startY} x2={dragChain.mouseX} y2={dragChain.mouseY} stroke="#00ffff" strokeWidth="2" strokeDasharray="4" />;
          const nextNode = nodes.find(n => n.id === dragChain.nodeIds[idx + 1]);
          return <line key={"dc-l-"+id} x1={startX} y1={startY} x2={nextNode.x + nodeSize.cx} y2={nextNode.y + nodeSize.cy} stroke="#00ffff" strokeWidth="2.5" />;
        })}

        {sliceLine && (
          sliceLine.isSelectMode ? (
            sliceLine.nodeIds?.map((id, idx) => {
              const currentNode = nodes.find(n => n.id === id);
              if (!currentNode) return null;
              const startX = currentNode.x + nodeSize.cx, startY = currentNode.y + nodeSize.cy;
              if (idx === sliceLine.nodeIds.length - 1) {
                return <line key={"sl-last-"+id} x1={startX} y1={startY} x2={sliceLine.endX} y2={sliceLine.endY} stroke="#ff00ff" strokeWidth="2" strokeDasharray="4" style={{ filter: 'drop-shadow(0 0 5px #ff00ff)' }} />;
              }
              const nextNode = nodes.find(n => n.id === sliceLine.nodeIds[idx + 1]);
              return <line key={"sl-link-"+id} x1={startX} y1={startY} x2={nextNode.x + nodeSize.cx} y2={nextNode.y + nodeSize.cy} stroke="#ff00ff" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 5px #ff00ff)' }} />;
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

      {/* NODE LAYER */}
      {nodes.map((node) => {
        const isInChain = dragChain?.nodeIds.includes(node.id);
        const isEditing = editingNodeId === node.id;
        const isMultiSelected = multiSelectedIds.includes(node.id);
        
        const bgImage = node.image 
          ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${node.image})` 
          : 'none';

        return (
          <div 
            key={node.id} 
            onMouseDown={(e) => {
              e.stopPropagation(); 
              onNodeMouseDown(e, node.id);
            }}
            onDoubleClick={(e) => {
              if (node.image && onOpenImage) {
                e.stopPropagation();
                onOpenImage(node.image);
              }
            }}
            style={{ 
              position: 'absolute', left: node.x, top: node.y, width: `${nodeSize.w}px`, height: `${nodeSize.h}px`,
              backgroundColor: colorMap[node.color] || '#333', 
              backgroundImage: bgImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: (node.color === 'G' || node.color === 'Y' || node.color === 'W') ? '#000' : '#fff', 
              border: (isEditing || isMultiSelected) 
                ? '3px solid #ff00ff' 
                : `${node.rank > 0 ? '3px' : '1px'} solid ${isInChain ? '#00ffff' : rankStrokeMap[node.rank] || 'transparent'}`, 
              borderRadius: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center', 
              fontSize: '11px', 
              fontWeight: 'bold', 
              zIndex: 10, 
              boxShadow: (isEditing || isMultiSelected) 
                ? '0 0 20px #ff00ff' 
                : (isInChain ? '0 0 15px #00ffff' : '0 4px 10px rgba(0,0,0,0.5)'), 
              cursor: node.image ? 'zoom-in' : 'crosshair',
              transition: 'transform 0.1s, box-shadow 0.1s',
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.2',
              padding: '5px',
              overflow: 'hidden'
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>
              {node.name}
            </span>

            {node.rank > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '4px', 
                right: '8px',
                fontSize: '10px',
                fontFamily: '"Times New Roman", serif',
                opacity: 0.9,
                pointerEvents: 'none',
                lineHeight: '1',
                zIndex: 3
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