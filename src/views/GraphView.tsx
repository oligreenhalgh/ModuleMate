import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Focus,
  CheckCircle,
  PlusCircle,
  Loader2,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getModules, getMajorPath, getMajor, addScheduleEntry } from '../services/api';
import type { MajorPath } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import type { Module } from '../types';

// --- Types for the graph ---

interface GraphNode {
  id: string;
  name: string;
  credits: number;
  semester: string;
  semesterIndex: number;
  status: 'completed' | 'available' | 'locked';
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

// --- Layout helpers ---

const NODE_W = 140;
const NODE_H = 64;
const COL_GAP = 200;
const ROW_GAP = 90;
const PAD_X = 80;
const PAD_Y = 100;

function layoutNodes(semesters: MajorPath['semesters']): { nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let maxRows = 0;

  semesters.forEach((sem, col) => {
    maxRows = Math.max(maxRows, sem.modules.length);
    sem.modules.forEach((mod, row) => {
      nodes.push({
        id: mod.code,
        name: mod.name,
        credits: mod.credits,
        semester: sem.name,
        semesterIndex: col,
        status: col === 0 ? 'available' : 'locked',
        x: PAD_X + col * COL_GAP,
        y: PAD_Y + row * ROW_GAP,
      });
    });
  });

  // Create edges: each module in semester N connects to modules in semester N+1
  for (let col = 0; col < semesters.length - 1; col++) {
    const currMods = semesters[col].modules;
    const nextMods = semesters[col + 1].modules;
    // Connect last module of current semester to first of next (prerequisite chain)
    if (currMods.length > 0 && nextMods.length > 0) {
      edges.push({
        from: currMods[currMods.length - 1].code,
        to: nextMods[0].code,
      });
    }
  }

  const width = PAD_X * 2 + semesters.length * COL_GAP;
  const height = PAD_Y * 2 + maxRows * ROW_GAP;

  return { nodes, edges, width, height };
}

function layoutModules(modules: Module[]): { nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number } {
  // Topological sort by prerequisites to assign columns
  const codeToMod = new Map(modules.map(m => [m.code, m]));
  const depths = new Map<string, number>();

  function getDepth(code: string): number {
    if (depths.has(code)) return depths.get(code)!;
    const mod = codeToMod.get(code);
    if (!mod || mod.prerequisites.length === 0) { depths.set(code, 0); return 0; }
    const d = 1 + Math.max(...mod.prerequisites.map(p => getDepth(p)));
    depths.set(code, d);
    return d;
  }

  modules.forEach(m => getDepth(m.code));

  // Group by depth
  const columns = new Map<number, Module[]>();
  modules.forEach(m => {
    const d = depths.get(m.code) || 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d)!.push(m);
  });

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let maxRows = 0;

  const sortedCols = [...columns.entries()].sort((a, b) => a[0] - b[0]);
  sortedCols.forEach(([col, mods], colIdx) => {
    maxRows = Math.max(maxRows, mods.length);
    mods.forEach((mod, row) => {
      nodes.push({
        id: mod.code,
        name: mod.name,
        credits: mod.credits,
        semester: `Level ${col + 1}`,
        semesterIndex: colIdx,
        status: mod.status,
        x: PAD_X + colIdx * COL_GAP,
        y: PAD_Y + row * ROW_GAP,
      });
    });
  });

  // Create edges from prerequisites
  modules.forEach(mod => {
    mod.prerequisites.forEach(pre => {
      if (codeToMod.has(pre)) {
        edges.push({ from: pre, to: mod.code });
      }
    });
  });

  const width = PAD_X * 2 + sortedCols.length * COL_GAP;
  const height = PAD_Y * 2 + maxRows * ROW_GAP;

  return { nodes, edges, width, height };
}

// --- Component ---

export function GraphView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const majorId = searchParams.get('major');

  const [modules, setModules] = useState<Module[]>([]);
  const [pathData, setPathData] = useState<MajorPath | null>(null);
  const [majorName, setMajorName] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (majorId) {
      // Load AI-generated path for a major
      Promise.all([getMajor(majorId), getMajorPath(majorId)])
        .then(([major, path]) => {
          setMajorName(major.name);
          setPathData(path);
        })
        .catch(() => toast.error('Failed to generate dependency graph.'))
        .finally(() => setLoading(false));
    } else {
      // Default: load modules from DB
      getModules()
        .then(setModules)
        .catch(err => toast.error(err.message))
        .finally(() => setLoading(false));
    }
  }, [majorId]);

  const { nodes, edges, width, height } = useMemo(() => {
    if (pathData && pathData.semesters.length > 0) {
      return layoutNodes(pathData.semesters);
    }
    if (modules.length > 0) {
      return layoutModules(modules);
    }
    return { nodes: [], edges: [], width: 800, height: 600 };
  }, [pathData, modules]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const handleAddToPlanner = async (node: GraphNode) => {
    try {
      await addScheduleEntry({
        module_code: node.id,
        course_name: node.name,
        schedule: 'TBD',
        professor: 'TBD',
        credits: node.credits,
        semester: node.semester,
      });
      toast.success(`${node.id} added to planner!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const fitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="flex-1 h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 size={32} className="text-primary animate-spin" />
        <p className="text-sm text-on-surface-variant">
          {majorId ? 'Generating dependency graph with AI...' : 'Loading modules...'}
        </p>
        {majorId && <p className="text-[10px] font-mono text-slate-500">This may take a few seconds</p>}
      </div>
    );
  }

  return (
    <div
      className="flex-1 h-screen relative overflow-hidden bg-background canvas-grid cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header bar for major path mode */}
      {majorId && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 p-3 bg-surface/90 backdrop-blur-xl border border-outline-variant/30 rounded-lg shadow-xl">
          <button onClick={() => navigate('/explorer')} className="p-1.5 hover:bg-white/5 rounded transition-colors text-slate-400 hover:text-white">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-headline font-bold text-sm">{majorName}</h3>
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest">Dependency Graph</p>
          </div>
          {pathData?.summary && (
            <div className="ml-4 pl-4 border-l border-outline-variant/20 max-w-sm">
              <p className="text-[10px] text-slate-400 leading-relaxed">{pathData.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width,
          height,
        }}
        className="absolute transition-transform duration-75"
      >
        {/* SVG Edges */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width, height }}>
          {edges.map((edge, i) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const cx1 = x1 + (x2 - x1) * 0.4;
            const cx2 = x2 - (x2 - x1) * 0.4;
            const isActive = selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={isActive ? '#B026FF' : '#2A2A35'}
                strokeWidth={isActive ? 2 : 1.5}
                strokeDasharray={isActive ? '5' : undefined}
                style={isActive ? { filter: 'drop-shadow(0 0 5px #B026FF)' } : undefined}
              />
            );
          })}
        </svg>

        {/* Semester Labels */}
        {pathData && pathData.semesters.map((sem, col) => (
          <div
            key={sem.name}
            className="absolute"
            style={{ left: PAD_X + col * COL_GAP, top: PAD_Y - 40, width: NODE_W }}
          >
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{sem.name}</span>
          </div>
        ))}

        {/* Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            data-node
            onClick={() => setSelectedNode(node)}
            className={cn(
              "absolute rounded flex flex-col items-center justify-center transition-all cursor-pointer select-none",
              node.status === 'completed' && "bg-surface-low border-2 border-green-500/50 hover:bg-surface-high",
              node.status === 'available' && "bg-surface-high border-2 border-secondary ring-2 ring-secondary/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]",
              node.status === 'locked' && "bg-surface-low border-2 border-dotted border-slate-600 opacity-70 hover:opacity-90",
              selectedNode?.id === node.id && "ring-4 ring-primary/40 shadow-[0_0_20px_rgba(176,38,255,0.3)]",
            )}
            style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
          >
            <span className={cn(
              "font-mono text-[11px] font-bold",
              node.status === 'completed' && "text-green-400",
              node.status === 'available' && "text-secondary",
              node.status === 'locked' && "text-slate-400",
            )}>
              {node.id}
            </span>
            <span className="text-[8px] text-slate-500 max-w-[120px] truncate text-center px-1">{node.name}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-10 left-10 flex items-center gap-2 p-1.5 bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded shadow-2xl z-10">
        <button onClick={() => setZoom(z => Math.min(z + 0.15, 2.5))} className="p-2 hover:bg-white/5 text-slate-400 transition-colors"><ZoomIn size={18} /></button>
        <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.3))} className="p-2 hover:bg-white/5 text-slate-400 transition-colors"><ZoomOut size={18} /></button>
        <div className="w-px h-4 bg-outline-variant/30 mx-1"></div>
        <button onClick={fitToScreen} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-slate-400 transition-colors">
          <Focus size={14} />
          <span className="text-[10px] font-mono uppercase tracking-widest">Fit to Screen</span>
        </button>
        <div className="w-px h-4 bg-outline-variant/30 mx-1"></div>
        <span className="text-[10px] font-mono text-slate-500 px-2">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Details Panel */}
      {selectedNode && (
        <aside className="absolute right-0 top-0 h-full w-[320px] bg-surface/90 backdrop-blur-2xl border-l border-outline-variant/30 p-8 flex flex-col gap-6 shadow-[-20px_0_40px_rgba(0,0,0,0.4)] z-10 overflow-y-auto custom-scrollbar">
          <header>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-secondary text-sm">{selectedNode.id}</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border",
                  selectedNode.status === 'completed' && "text-green-400 bg-green-500/10 border-green-500/20",
                  selectedNode.status === 'available' && "text-secondary bg-secondary/10 border-secondary/20",
                  selectedNode.status === 'locked' && "text-slate-500 bg-slate-500/10 border-slate-500/20",
                )}>
                  {selectedNode.status}
                </span>
                <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[10px] font-mono font-bold border border-secondary/20">
                  {selectedNode.credits} MC
                </span>
              </div>
            </div>
            <h3 className="font-headline text-2xl font-bold leading-tight mb-2">{selectedNode.name}</h3>
            <p className="text-xs text-slate-400">{selectedNode.semester}</p>
          </header>

          <div className="space-y-6">
            {/* Incoming edges (prerequisites) */}
            <section>
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">Prerequisites</h4>
              <div className="space-y-2">
                {edges.filter(e => e.to === selectedNode.id).map(e => {
                  const prereq = nodeMap.get(e.from);
                  return prereq ? (
                    <div key={e.from} className="flex items-center gap-3 p-3 bg-surface-high/40 rounded border-l-2 border-green-500">
                      <CheckCircle size={14} className="text-green-500" />
                      <div>
                        <p className="text-[11px] font-mono text-on-surface">{prereq.id}</p>
                        <p className="text-[9px] text-slate-500">{prereq.name}</p>
                      </div>
                    </div>
                  ) : null;
                })}
                {edges.filter(e => e.to === selectedNode.id).length === 0 && (
                  <p className="text-[10px] text-slate-500">No prerequisites</p>
                )}
              </div>
            </section>

            {/* Outgoing edges (unlocks) */}
            <section>
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">Unlocks</h4>
              <div className="flex flex-wrap gap-2">
                {edges.filter(e => e.from === selectedNode.id).map(e => (
                  <span key={e.to} className="px-2 py-1 bg-surface-high rounded text-[10px] font-mono text-slate-300 border border-outline-variant/10">
                    {e.to}
                  </span>
                ))}
                {edges.filter(e => e.from === selectedNode.id).length === 0 && (
                  <p className="text-[10px] text-slate-500">Terminal module</p>
                )}
              </div>
            </section>

            <section className="mt-auto pt-6 space-y-3">
              <button
                onClick={() => handleAddToPlanner(selectedNode)}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded flex items-center justify-center gap-2 transition-all group"
              >
                <PlusCircle size={18} className="group-hover:translate-x-1 transition-transform" />
                <span className="text-sm font-headline uppercase tracking-widest">Add to Planner</span>
              </button>
              <button
                onClick={() => navigate('/explorer')}
                className="w-full border border-secondary/30 text-secondary font-bold py-2.5 px-6 rounded flex items-center justify-center gap-2 hover:bg-secondary/10 transition-all"
              >
                <BookOpen size={16} />
                <span className="text-xs font-headline uppercase tracking-widest">View in Explorer</span>
              </button>
            </section>
          </div>
        </aside>
      )}

      {/* Legend */}
      <div className="absolute bottom-10 right-10 flex items-center gap-4 p-3 bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded shadow-2xl z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-green-500/50 bg-surface-low"></div>
          <span className="text-[9px] font-mono text-slate-400 uppercase">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-secondary bg-surface-high"></div>
          <span className="text-[9px] font-mono text-slate-400 uppercase">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-dotted border-slate-600 bg-surface-low"></div>
          <span className="text-[9px] font-mono text-slate-400 uppercase">Locked</span>
        </div>
      </div>

      {/* Minimap */}
      {nodes.length > 0 && (
        <div className={cn(
          "absolute top-4 w-48 h-32 bg-surface-low/80 border border-outline-variant/20 rounded-lg overflow-hidden backdrop-blur-md z-10",
          selectedNode ? "right-[340px]" : "right-4"
        )}>
          <svg className="w-full h-full p-2" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            {edges.map((edge, i) => {
              const from = nodeMap.get(edge.from);
              const to = nodeMap.get(edge.to);
              if (!from || !to) return null;
              return <line key={i} x1={from.x + NODE_W / 2} y1={from.y + NODE_H / 2} x2={to.x + NODE_W / 2} y2={to.y + NODE_H / 2} stroke="#2A2A35" strokeWidth={3} />;
            })}
            {nodes.map(node => (
              <rect
                key={node.id}
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={4}
                fill={
                  selectedNode?.id === node.id ? '#B026FF' :
                  node.status === 'completed' ? 'rgba(34,197,94,0.4)' :
                  node.status === 'available' ? 'rgba(0,240,255,0.4)' :
                  'rgba(100,116,139,0.3)'
                }
              />
            ))}
          </svg>
          <div className="absolute bottom-0 w-full bg-surface-high px-2 py-1 border-t border-outline-variant/10">
            <span className="text-[8px] font-mono text-slate-500 uppercase">
              {nodes.length} modules · {pathData ? pathData.semesters.length + ' semesters' : 'Navigator'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
