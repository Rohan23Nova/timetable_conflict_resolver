import type { GraphVertex, GraphEdge } from "@/types/api";
import { Node, Edge } from "@xyflow/react";

export type LayoutMode = "concentric" | "circle" | "grid";

export interface LayoutOptions {
  mode: LayoutMode;
  selectedNodeId: string | null;
  searchTerm: string;
  filterMode: "all" | "conflicts" | "isolated" | "hubs";
}

export interface GraphLayoutResult {
  nodes: Node[];
  edges: Edge[];
  visibleVertexCount: number;
  visibleEdgeCount: number;
}

/**
 * Find connected components in an undirected graph using BFS.
 */
function findConnectedComponents(
  vertices: GraphVertex[],
  edges: GraphEdge[]
): GraphVertex[][] {
  const adj = new Map<string, string[]>();
  for (const v of vertices) {
    adj.set(v.code, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  }

  const visited = new Set<string>();
  const components: GraphVertex[][] = [];
  const vertexMap = new Map<string, GraphVertex>();
  for (const v of vertices) {
    vertexMap.set(v.code, v);
  }

  for (const v of vertices) {
    if (!visited.has(v.code)) {
      const component: GraphVertex[] = [];
      const queue: string[] = [v.code];
      visited.add(v.code);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const vertexObj = vertexMap.get(curr);
        if (vertexObj) component.push(vertexObj);

        for (const neighbor of adj.get(curr) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      components.push(component);
    }
  }

  // Sort components by size descending
  return components.sort((a, b) => b.length - a.length);
}

/**
 * Calculates deterministic coordinates for nodes and formats edges for React Flow.
 */
export function computeGraphLayout(
  vertices: GraphVertex[],
  edges: GraphEdge[],
  options: LayoutOptions
): GraphLayoutResult {
  const { mode, selectedNodeId, searchTerm, filterMode } = options;

  // 1. Identify neighbours of selected node
  const neighborCodes = new Set<string>();
  if (selectedNodeId) {
    for (const e of edges) {
      if (e.source === selectedNodeId) neighborCodes.add(e.target);
      if (e.target === selectedNodeId) neighborCodes.add(e.source);
    }
  }

  // 2. Filter vertices according to filterMode
  let filteredVertices = vertices;
  if (filterMode === "conflicts") {
    filteredVertices = vertices.filter((v) => v.degree > 0);
  } else if (filterMode === "isolated") {
    filteredVertices = vertices.filter((v) => v.degree === 0);
  } else if (filterMode === "hubs") {
    filteredVertices = vertices.filter((v) => v.degree >= 3);
  }

  const visibleCodes = new Set(filteredVertices.map((v) => v.code));

  // 3. Filter edges whose both endpoints are in visibleCodes
  const filteredEdges = edges.filter(
    (e) => visibleCodes.has(e.source) && visibleCodes.has(e.target)
  );

  // 4. Calculate components and layout
  const components = findConnectedComponents(filteredVertices, filteredEdges);
  const nodePositions = new Map<string, { x: number; y: number }>();

  // Separate non-isolated components from isolated nodes
  const nonIsolatedComponents = components.filter((c) => c.length > 1);
  const isolatedNodes = components.filter((c) => c.length === 1).map((c) => c[0]);

  let currentOffsetX = 60;
  const currentOffsetY = 60;

  for (const comp of nonIsolatedComponents) {
    const N = comp.length;
    // Sort component nodes by degree descending, then by code ascending
    const sortedComp = [...comp].sort((a, b) => b.degree - a.degree || a.code.localeCompare(b.code));

    if (mode === "grid") {
      const cols = Math.ceil(Math.sqrt(N * 1.5));
      const colWidth = 260;
      const rowHeight = 150;

      for (let i = 0; i < N; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        nodePositions.set(sortedComp[i].code, {
          x: currentOffsetX + col * colWidth,
          y: currentOffsetY + row * rowHeight,
        });
      }
      currentOffsetX += cols * colWidth + 120;
    } else if (mode === "concentric" && N >= 6) {
      // Concentric circles: high degree hubs in inner circle, lower in outer
      const hubCount = Math.max(2, Math.floor(N * 0.35));
      const hubs = sortedComp.slice(0, hubCount);
      const outer = sortedComp.slice(hubCount);

      const radiusInner = 140;
      const radiusOuter = Math.max(280, 40 * outer.length);
      const centerX = currentOffsetX + radiusOuter + 60;
      const centerY = currentOffsetY + radiusOuter + 40;

      // Inner circle
      for (let i = 0; i < hubs.length; i++) {
        const angle = (2 * Math.PI * i) / hubs.length;
        nodePositions.set(hubs[i].code, {
          x: Math.round(centerX + radiusInner * Math.cos(angle) - 100),
          y: Math.round(centerY + radiusInner * Math.sin(angle) - 45),
        });
      }

      // Outer circle
      for (let i = 0; i < outer.length; i++) {
        const angle = (2 * Math.PI * i) / outer.length;
        nodePositions.set(outer[i].code, {
          x: Math.round(centerX + radiusOuter * Math.cos(angle) - 100),
          y: Math.round(centerY + radiusOuter * Math.sin(angle) - 45),
        });
      }

      currentOffsetX += (radiusOuter + 60) * 2 + 100;
    } else {
      // Single circular or small component layout
      const radius = N === 2 ? 140 : Math.max(160, N * 35);
      const centerX = currentOffsetX + radius + 40;
      const centerY = currentOffsetY + radius + 40;

      for (let i = 0; i < N; i++) {
        const angle = (2 * Math.PI * i) / N;
        nodePositions.set(sortedComp[i].code, {
          x: Math.round(centerX + radius * Math.cos(angle) - 100),
          y: Math.round(centerY + radius * Math.sin(angle) - 45),
        });
      }

      currentOffsetX += (radius + 40) * 2 + 100;
    }
  }

  // Position isolated nodes in a neat sidebar/grid area
  if (isolatedNodes.length > 0) {
    const isolatedStartX = Math.max(currentOffsetX, 80);
    const isolatedStartY = 60;
    const isoCols = Math.min(3, Math.ceil(isolatedNodes.length / 6) || 1);
    const isoColWidth = 240;
    const isoRowHeight = 130;

    for (let i = 0; i < isolatedNodes.length; i++) {
      const col = i % isoCols;
      const row = Math.floor(i / isoCols);
      nodePositions.set(isolatedNodes[i].code, {
        x: isolatedStartX + col * isoColWidth,
        y: isolatedStartY + row * isoRowHeight,
      });
    }
  }

  // 5. Construct React Flow Nodes
  const searchLower = searchTerm.trim().toLowerCase();
  const nodes: Node[] = filteredVertices.map((v) => {
    const isSelected = selectedNodeId === v.code;
    const isNeighbor = neighborCodes.has(v.code);
    const isSearchMatch = Boolean(
      searchLower &&
        (v.code.toLowerCase().includes(searchLower) ||
          v.name.toLowerCase().includes(searchLower))
    );
    const isDimmed = Boolean(
      (selectedNodeId && !isSelected && !isNeighbor) ||
        (searchLower && !isSearchMatch)
    );

    const pos = nodePositions.get(v.code) || { x: 0, y: 0 };

    return {
      id: v.code,
      type: "examNode",
      position: pos,
      data: {
        vertex: v,
        isSelected,
        isNeighbor,
        isDimmed,
        isSearchMatch,
      },
    };
  });

  // 6. Construct React Flow Edges
  const edgesOutput: Edge[] = filteredEdges.map((e) => {
    const edgeId = `${e.source}--${e.target}`;
    const connectsToSelected =
      selectedNodeId === e.source || selectedNodeId === e.target;
    const isDimmed = Boolean(selectedNodeId && !connectsToSelected);

    // Compute stroke style
    let strokeColor = "#374151"; // border-border-strong default
    let strokeWidth = 1.5;
    let animated = false;

    if (connectsToSelected) {
      strokeColor = "#F5A64A"; // Accent Amber
      strokeWidth = 3;
      animated = true;
    } else if (isDimmed) {
      strokeColor = "rgba(75, 85, 99, 0.25)";
      strokeWidth = 1;
    }

    return {
      id: edgeId,
      source: e.source,
      target: e.target,
      sourceHandle: "center",
      targetHandle: "center",
      type: "default",
      animated,
      style: {
        stroke: strokeColor,
        strokeWidth,
        opacity: isDimmed ? 0.3 : 1,
      },
      label: e.weight > 1 ? `${e.weight} students` : undefined,
      labelStyle: {
        fill: connectsToSelected ? "#F5A64A" : "#9CA3AF",
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "monospace",
      },
      labelBgStyle: {
        fill: "#1B1E25",
        fillOpacity: 0.9,
        rx: 4,
        ry: 4,
      },
      data: {
        weight: e.weight,
        shared_students: e.shared_students,
        connectsToSelected,
      },
    };
  });

  return {
    nodes,
    edges: edgesOutput,
    visibleVertexCount: filteredVertices.length,
    visibleEdgeCount: filteredEdges.length,
  };
}
