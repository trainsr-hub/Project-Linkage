// src/config/nodeSize.js

export const NODE_SIZE = {
  default: { w: 190, h: 55, cx: 95, cy: 27.5 },
  "1:1": { w: 150, h: 150, cx: 75, cy: 75 },
  large: { w: 240, h: 70, cx: 120, cy: 35 }
};

// CHỖ QUAN TRỌNG: hàm nhận key từ App
export const getNodeSize = (type = 'default') => {
  return NODE_SIZE[type] || NODE_SIZE.default;
};