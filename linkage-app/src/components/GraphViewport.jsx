import React from 'react';

const GraphViewport = ({ 
  viewportRef, 
  nodes, 
  edges, 
  dragChain, 
  onNodeMouseDown, 
  colorMap, 
  rankStrokeMap 
}) => {
  return (
    <div ref={viewportRef} onContextMenu={(e) => e.preventDefault()} style={{ flex: 1, position: 'relative', overflow: 'auto', backgroundColor: '#050505' }}>
      <div style={{ position: 'absolute', width: '4000px', height: '4000px', backgroundImage: 'radial-gradient(#222 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.5 }} />
      
      <svg style={{ position: 'absolute', width: '4000px', height: '4000px', top: 0, left: 0, pointerEvents: 'none' }}>
        {edges.map((edge, i) => (
          <line key={i} x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} stroke="#ffffff22" strokeWidth="1" />
        ))}
        {dragChain && dragChain.nodeIds.map((id, idx) => {
          const currentNode = nodes.find(n => n.id === id);
          if (!currentNode) return null;
          const startX = currentNode.x + 95, startY = currentNode.y + 27.5;
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
            onMouseDown={(e) => onNodeMouseDown(e, node.id)}
            style={{ 
              position: 'absolute', left: node.x, top: node.y, width: '190px', height: '55px', backgroundColor: colorMap[node.color], 
              color: (node.color === 'G' || node.color === 'Y') ? '#000' : '#fff', 
              border: `${node.rank > 0 ? '3px' : '1px'} solid ${isInChain ? '#00ffff' : rankStrokeMap[node.rank] || 'transparent'}`, 
              borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', zIndex: 10, 
              boxShadow: isInChain ? '0 0 15px #00ffff' : '0 4px 10px rgba(0,0,0,0.5)', cursor: 'crosshair' 
            }}
          >{node.displayName}</div>
        );
      })}
    </div>
  );
};

export default GraphViewport;