import { Entity, Relationship } from '@/domain/models';
export interface PositionedNode { entity: Entity; x: number; y: number; degree: number }
export interface GraphLayout { nodes: PositionedNode[]; edges: Relationship[]; width: number; height: number }

// Pure and deterministic. It can move to a worker/native layout without touching rendering state.
export function layoutGraph(entities: Entity[], relationships: Relationship[], width: number, height: number, focusId?: string): GraphLayout {
  const degree = new Map<string, number>();
  relationships.forEach(edge => { degree.set(edge.sourceEntityId, (degree.get(edge.sourceEntityId) ?? 0) + 1); degree.set(edge.targetEntityId, (degree.get(edge.targetEntityId) ?? 0) + 1); });
  const sorted = [...entities].sort((a, b) => focusId === a.id ? -1 : focusId === b.id ? 1 : (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
  const centerX = width / 2; const centerY = height / 2;
  const nodes = sorted.map((entity, index) => {
    if (index === 0) return { entity, x: centerX, y: centerY, degree: degree.get(entity.id) ?? 0 };
    const ring = Math.floor((Math.sqrt(index) + 1) / 1.8); const positionInRing = index - ring * ring; const count = Math.max(6, ring * 7);
    const angle = (positionInRing / count) * Math.PI * 2 + ring * .63; const radius = 104 + ring * 90;
    return { entity, x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius, degree: degree.get(entity.id) ?? 0 };
  });
  return { nodes, edges: relationships, width, height };
}
