import { useCallback, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

/**
 * Custom edge with a draggable midpoint control.
 * The edge routes as two straight segments through the midpoint.
 * Drag the gold circle to adjust the elbow position.
 */
export function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();

  // Midpoint offset stored in edge data (persisted)
  const offsetX = (data?.midOffsetX as number) ?? 0;
  const offsetY = (data?.midOffsetY as number) ?? 0;

  // Default midpoint
  const defaultMidX = (sourceX + targetX) / 2;
  const defaultMidY = (sourceY + targetY) / 2;
  const midX = defaultMidX + offsetX;
  const midY = defaultMidY + offsetY;

  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Build orthogonal path: source → down to midY → across to midX → down to target
  // Using smooth corners with small arcs
  const r = 8; // corner radius

  // Vertical-first routing: go down from source, horizontal to align, then down to target
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startOffsetX = offsetX;
    const startOffsetY = offsetY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setEdges(prev => prev.map(edge =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, midOffsetX: startOffsetX + dx, midOffsetY: startOffsetY + dy } }
          : edge
      ));
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, offsetX, offsetY, setEdges]);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          strokeLinejoin: 'round',
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => !dragging && setHovered(false)}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: dragging
                ? 'var(--jf-gold)'
                : hovered
                  ? 'rgba(216, 131, 10, 0.6)'
                  : 'rgba(235, 231, 199, 0.15)',
              border: `2px solid ${dragging || hovered ? 'var(--jf-gold)' : 'rgba(235, 231, 199, 0.2)'}`,
              cursor: 'grab',
              transition: dragging ? 'none' : 'all 0.15s',
              opacity: dragging || hovered ? 1 : 0,
            }}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default EditableEdge;
