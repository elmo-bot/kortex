import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { EntityType } from '@/domain/models';
import { colors } from '@/design/tokens';
import { GraphLayout } from './graphLayout';

export const GraphCanvas = memo(function GraphCanvas({ layout, selectedId, zoomLevel, depth, onSelect }: { layout: GraphLayout; selectedId?: string; zoomLevel: number; depth: 1 | 2; onSelect(id: string): void }) {
  const positions = useMemo(() => new Map(layout.nodes.map(node => [node.entity.id, node])), [layout.nodes]);
  const neighbors = useMemo(() => new Set(layout.edges.flatMap(edge => edge.sourceEntityId === selectedId ? [edge.targetEntityId] : edge.targetEntityId === selectedId ? [edge.sourceEntityId] : [])), [layout.edges, selectedId]);
  const secondDegree = useMemo(() => {
    if (!selectedId || depth === 1) return new Set<string>();
    const result = new Set<string>();
    layout.edges.forEach(edge => {
      if (neighbors.has(edge.sourceEntityId)) result.add(edge.targetEntityId);
      if (neighbors.has(edge.targetEntityId)) result.add(edge.sourceEntityId);
    });
    return result;
  }, [depth, layout.edges, neighbors, selectedId]);
  return <View style={StyleSheet.absoluteFill} accessibilityLabel="Interactive knowledge graph. A list alternative is available above.">
    <Svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`}>
      {layout.edges.map(edge => { const source = positions.get(edge.sourceEntityId); const target = positions.get(edge.targetEntityId); if (!source || !target) return null; const relevant = !selectedId || edge.sourceEntityId === selectedId || edge.targetEntityId === selectedId; return <Line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={relevant ? colors.lineStrong : 'rgba(130,158,170,.06)'} strokeWidth={relevant ? 1.25 + (edge.confidence ?? .5) : .5} />; })}
      {layout.nodes.map(node => { const selected = selectedId === node.entity.id; const related = neighbors.has(node.entity.id); const relevant = !selectedId || selected || related || secondDegree.has(node.entity.id); const size = selected ? 25 : Math.min(21, 13 + node.degree * 1.5); const showLabel = selected || related || (zoomLevel >= 1.35 && relevant) || (!selectedId && node.degree >= (zoomLevel < .82 ? 3 : 1)); return <G key={node.entity.id} x={node.x} y={node.y} opacity={relevant ? 1 : .18} onPress={() => onSelect(node.entity.id)} accessibilityLabel={`${node.entity.displayName}, ${node.entity.type}, ${node.degree} connections`}>
        {selected ? <Circle r={size + 9} fill="rgba(126,221,244,.06)" stroke="rgba(126,221,244,.28)" /> : null}<NodeShape type={node.entity.type} size={size} selected={selected} />{showLabel ? <SvgText y={size + 17} fill={relevant ? colors.text : colors.textFaint} fontSize={selected ? 12 : 10} fontWeight={selected ? '600' : '500'} textAnchor="middle">{node.entity.displayName.length > 17 ? `${node.entity.displayName.slice(0, 15)}…` : node.entity.displayName}</SvgText> : null}
      </G>; })}
    </Svg>
  </View>;
});

function NodeShape({ type, size, selected }: { type: EntityType; size: number; selected: boolean }) {
  const fill = selected ? colors.cyan : type === 'idea' ? '#B6AA79' : '#183340'; const stroke = selected ? colors.ice : colors.cyan;
  if (type === 'company') return <Rect x={-size} y={-size} width={size * 2} height={size * 2} rx={size * .32} fill={fill} stroke={stroke} strokeWidth={1.2} />;
  if (type === 'project') return <Polygon points={`${-size},0 ${-size / 2},${-size * .86} ${size / 2},${-size * .86} ${size},0 ${size / 2},${size * .86} ${-size / 2},${size * .86}`} fill={fill} stroke={stroke} strokeWidth={1.2} />;
  if (type === 'document') return <Path d={`M ${-size * .72} ${-size} H ${size * .3} L ${size * .72} ${-size * .55} V ${size} H ${-size * .72} Z`} fill={fill} stroke={stroke} />;
  if (type === 'meeting') return <Circle r={size} fill={fill} stroke={stroke} strokeWidth={3} strokeDasharray="4 3" />;
  return <Circle r={type === 'idea' ? size * .62 : size} fill={fill} stroke={stroke} strokeWidth={type === 'idea' ? 2 : 1.2} />;
}
