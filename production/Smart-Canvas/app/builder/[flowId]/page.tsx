"use client"

import React, { useState, useCallback, DragEvent, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  Node,
  Edge,
  Connection,
  ReactFlowInstance,
  useNodesState,
  useEdgesState,
  NodeTypes,
  XYPosition,
  MarkerType,
  NodeDragHandler,
  NodeChange,
  EdgeChange,
  SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ReactMarkdown from 'react-markdown';
import InputNode, { InputNodeData } from '@/components/builder-nodes/InputNode';
import OutputNode from '@/components/builder-nodes/OutputNode';
import LLMNode, { LLMNodeData } from '@/components/builder-nodes/LLMNode';
import ComposioNode, { ComposioNodeData } from '@/components/builder-nodes/ComposioNode';
import VectorStoreNode, { VectorStoreNodeData } from '@/components/builder-nodes/VectorStoreNode';
import HuggingFaceNode, { HuggingFaceNodeData } from '@/components/builder-nodes/HuggingFaceNode';
import DatabaseNode, { DatabaseNodeData } from '@/components/builder-nodes/DatabaseNode';
import FileStorageNode, { FileStorageNodeData } from '@/components/builder-nodes/FileStorageNode';
import MemoryNode, { MemoryNodeData } from '@/components/builder-nodes/MemoryNode';
import LocalLLMNode, { LocalLLMNodeData } from '@/components/builder-nodes/LocalLLMNode';
import AgentNode, { AgentNodeData } from '@/components/builder-nodes/AgentNode';
import CoordinatorNode, { CoordinatorNodeData } from '@/components/builder-nodes/CoordinatorNode';
import URLScraperNode, { URLScraperNodeData } from '@/components/builder-nodes/URLScraperNode';
import YouTubeNode, { YouTubeNodeData } from '@/components/builder-nodes/YouTubeNode';
import ChatWithAnythingNode, { ChatWithAnythingNodeData } from '@/components/builder-nodes/ChatWithAnythingNode';
import DocumentUploadNode, { DocumentUploadNodeData } from '@/components/builder-nodes/DocumentUploadNode';
import MediaUploadNode, { MediaUploadNodeData } from '@/components/builder-nodes/MediaUploadNode';
import ImageGenerationNode, { ImageGenerationNodeData } from '@/components/builder-nodes/ImageGenerationNode';
import ImageToImageNode, { ImageToImageNodeData } from '@/components/builder-nodes/ImageToImageNode';
import TextToSpeechNode, { TextToSpeechNodeData } from '@/components/builder-nodes/TextToSpeechNode';
import VoiceCloningNode, { VoiceCloningNodeData } from '@/components/builder-nodes/VoiceCloningNode';
import { MessageSquare, BrainCircuit, Puzzle, ArrowRightCircle, DownloadCloud, PanelLeftOpen, PanelRightOpen, PanelLeftClose, PanelRightClose, Trash2, Group, Share2, Upload, Loader2, Save, X, Calendar, Settings, Palette, Zap, Database, Brain, Cloud, Archive, Monitor, Globe, Youtube, FileText, Image, Play, Plus, Minus, Maximize2, Lock, Unlock, Link, Volume2, UserCheck } from 'lucide-react';
import { ReactFlowGridBackground } from '@/components/ui/multi-background';
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AugmentedLLMPattern from '@/components/workflow-patterns/AugmentedLLMPattern';
import PromptChainingPattern from '@/components/workflow-patterns/PromptChainingPattern';
import RoutingPattern from '@/components/workflow-patterns/RoutingPattern';
import ParallelisationPattern from '@/components/workflow-patterns/ParallelisationPattern';
import EvaluatorOptimiserPattern from '@/components/workflow-patterns/EvaluatorOptimiserPattern';
import { Input } from '@/components/ui/input';
import PatternMetaNode from '@/components/builder-nodes/PatternMetaNode';
import FlowingEdge from '@/components/builder-nodes/FlowingEdge';
import ToolsWindow from '@/components/builder-nodes/ToolsWindow';
import ConnectionsPanel from '@/components/builder-nodes/ConnectionsPanel';
import OnboardingTutorial from '@/app/dashboard/onboarding/OnboardingTutorial';
import Joyride from 'react-joyride';
import AgentBuilder from '@/components/builder-nodes/AgentBuilder';
import { installDefaultTemplates } from '@/templates/default-templates';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

// Template data structure
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  created: string;
  category: 'Saved';
}

// Template storage functions
const TEMPLATES_STORAGE_KEY = 'metatron-saved-templates';

const saveTemplate = (template: WorkflowTemplate) => {
  const templates = getTemplates();
  templates.push(template);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
};

const getTemplates = (): WorkflowTemplate[] => {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const deleteTemplate = (templateId: string) => {
  const templates = getTemplates().filter(t => t.id !== templateId);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
};

// Flow Tool data structure (extends WorkflowTemplate)
interface FlowTool extends WorkflowTemplate {
  isActive: boolean;
  executionEndpoint: string;
  triggerKeywords: string[];
  toolType: 'flow-tool' | 'agent-flow';
  usageCount: number;
  lastUsed?: string;
  capabilities?: string[];
  agentType?: 'orchestrator' | 'coordinator';
}

// Flow Tool storage functions
const FLOW_TOOLS_STORAGE_KEY = 'metatron-flow-tools';

const saveFlowTool = (flowTool: FlowTool) => {
  const flowTools = getFlowTools();
  flowTools.push(flowTool);
  localStorage.setItem(FLOW_TOOLS_STORAGE_KEY, JSON.stringify(flowTools));
};

const getFlowTools = (): FlowTool[] => {
  try {
    const stored = localStorage.getItem(FLOW_TOOLS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const toggleFlowTool = (toolId: string) => {
  const flowTools = getFlowTools();
  const updatedTools = flowTools.map(tool =>
    tool.id === toolId ? { ...tool, isActive: !tool.isActive } : tool
  );
  localStorage.setItem(FLOW_TOOLS_STORAGE_KEY, JSON.stringify(updatedTools));
  return updatedTools;
};

const deleteFlowTool = (toolId: string) => {
  const flowTools = getFlowTools().filter(t => t.id !== toolId);
  localStorage.setItem(FLOW_TOOLS_STORAGE_KEY, JSON.stringify(flowTools));
};

export default function BuilderPage() {
// Helper function to create a unique ID
const getUniqueNodeId = (type: string) => `${type}_${Math.random().toString(36).substr(2, 9)}`;

// localStorage keys
const LOCAL_STORAGE_NODES_KEY = 'reactFlowNodes';
const LOCAL_STORAGE_EDGES_KEY = 'reactFlowEdges';

// Define modelOptions before it's used in sidebarNodeTypes - LATEST MODELS ONLY
const modelOptions = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-exp'],
  orchestrator: ['metatron-pydantic-orchestrator'],
  coordinator: ['metatron-pydantic-coordinator'],
};

// Sidebar item configuration
const sidebarNodeTypes = [
  { type: 'customInput', label: 'Input Node', icon: <MessageSquare size={18} /> , defaultData: { label: 'Start Query', query: '', chatMode: false }, category: 'Data' },
  { type: 'llm', label: 'LLM Node', icon: <BrainCircuit size={18} />, defaultData: { label: 'LLM Call', systemPrompt: '', apiKey: '' }, category: 'LLM' },
  { type: 'composio', label: 'Action Tool', icon: <Puzzle size={18} />, defaultData: { label: 'Action Tool', apiKey: '', toolAction: '' }, category: 'Tools' },
  { type: 'vectorStore', label: 'Vector Store', icon: <Save size={18} />, defaultData: { label: 'Vector Store', storeType: 'pinecone', operation: 'search', apiKey: '', indexName: '', topK: 5, similarityThreshold: 0.7 }, category: 'Data' },
  { type: 'huggingFace', label: 'Hugging Face', icon: <Brain size={18} />, defaultData: { label: 'Hugging Face', taskType: 'text-generation', modelName: 'gpt2', apiKey: '', maxTokens: 100, temperature: 0.7, topP: 0.9, useCustomModel: false }, category: 'LLM' },
  { type: 'database', label: 'Database', icon: <Database size={18} />, defaultData: { label: 'Database', databaseType: 'postgresql', operation: 'select', connectionString: '', query: '', timeout: 30 }, category: 'Data' },
  { type: 'fileStorage', label: 'File Storage', icon: <Cloud size={18} />, defaultData: { label: 'File Storage', storageProvider: 'aws-s3', operation: 'upload', region: 'us-east-1', accessKeyId: '', secretAccessKey: '', bucketName: '', fileName: '', contentType: 'application/octet-stream', makePublic: false }, category: 'Data' },
  { type: 'memory', label: 'Memory', icon: <Archive size={18} />, defaultData: { label: 'Memory', memoryType: 'conversation', storageBackend: 'local', operation: 'store', memoryKey: '', maxTokens: 4000, retentionDays: 30, similarityThreshold: 0.7 }, category: 'Data' },
  { type: 'localLLM', label: 'Local LLM', icon: <Monitor size={18} />, defaultData: { label: 'Local LLM', provider: 'ollama', endpoint: 'http://localhost:11434', modelName: 'llama2', systemPrompt: '', maxTokens: 2048, temperature: 0.7, topP: 0.9, stream: false, healthCheck: true, timeout: 30 }, category: 'LLM' },
  { type: 'customOutput', label: 'Output Node', icon: <ArrowRightCircle size={18} />, defaultData: { label: 'End Result' }, category: 'Data' },
  { type: 'agent', label: 'Action Agent', icon: <Group size={18} />,
    defaultData: {
      label: 'Action Agent',
      modelProvider: 'openai',
      modelName: modelOptions.openai[0], // Use modelOptions here
      systemPrompt: '',
      llmApiKey: '',
      composioApiKey: '',
      allowedTools: ''
    },
    category: 'Tools'
  },
  { type: 'coordinator', label: 'Coordinator Node', icon: <Share2 size={18} />,
    defaultData: {
      label: 'Coordinator',
      agentName: '',
      agentDescription: '',
      capabilities: '',
      modelProvider: 'coordinator',
      modelName: modelOptions.coordinator[0],
      systemPrompt: '',
      apiKey: ''
    },
    category: 'LLM'
  },
  { type: 'urlScraper', label: 'URL Scraper', icon: <Globe size={18} />, defaultData: { label: 'URL Scraper', url: '', scrapedContent: '' }, category: 'Tools' },
  { type: 'youtube', label: 'YouTube', icon: <Youtube size={18} />, defaultData: { label: 'YouTube', url: '', videoData: null }, category: 'Tools' },
  { type: 'chatWithAnything', label: 'Chat with Anything', icon: <MessageSquare size={18} />, defaultData: { label: 'Chat with Anything', systemPrompt: 'You are a helpful AI assistant. Analyze and respond to any input you receive.', apiKey: '', modelProvider: 'openai', modelName: 'gpt-4', messages: [], currentInput: '' }, category: 'Tools' },
  { type: 'documentUpload', label: 'Document Upload', icon: <FileText size={18} />, defaultData: { label: 'Document Upload', uploadedFile: undefined, extractedText: '' }, category: 'Tools' },
  { type: 'mediaUpload', label: 'Media Upload', icon: <Image size={18} />, defaultData: { label: 'Media Upload', uploadedFile: undefined, analysisResult: undefined }, category: 'Tools' },
  { type: 'imageGeneration', label: 'Image Generation', icon: <Palette size={18} />, defaultData: { label: 'Image Generator', prompt: '', provider: 'openai', model: 'dall-e-3', apiKey: '', width: 1024, height: 1024 }, category: 'Tools' },
  { type: 'imageToImage', label: 'Image Transform', icon: <Zap size={18} />, defaultData: { label: 'Image Transform', prompt: '', provider: 'stability', model: 'stable-diffusion-xl-1024-v1-0', apiKey: '', strength: 0.7, guidance: 7.5, steps: 20 }, category: 'Tools' },
  { type: 'textToSpeech', label: 'Text to Speech', icon: <Volume2 size={18} />, defaultData: { label: 'Text to Speech', text: '', provider: 'elevenlabs', voice: 'rachel', apiKey: '', speed: 1.0 }, category: 'Tools' },
  { type: 'voiceCloning', label: 'Voice Cloning', icon: <UserCheck size={18} />, defaultData: { label: 'Voice Cloning', text: '', provider: 'elevenlabs', voiceName: '', apiKey: '' }, category: 'Tools' },
];

const allSidebarItems = [
  ...sidebarNodeTypes.map(n => ({
    key: n.type,
    label: n.label,
    icon: n.icon,
    description: n.type === 'customInput' ? 'Start your flow with user input' :
                 n.type === 'llm' ? 'Process with AI language model' :
                 n.type === 'composio' ? '300+ action tools for automation' :
                 n.type === 'vectorStore' ? 'Store and retrieve vector embeddings' :
                 n.type === 'huggingFace' ? 'Use Hugging Face models for AI tasks' :
                 n.type === 'database' ? 'Connect to SQL/NoSQL databases' :
                 n.type === 'fileStorage' ? 'Manage cloud file storage operations' :
                 n.type === 'memory' ? 'Store and retrieve conversation memory' :
                 n.type === 'localLLM' ? 'Connect to local LLM providers' :
                 n.type === 'customOutput' ? 'Display final results' :
                 n.type === 'agent' ? 'LLM agent with 300+ tool access' :
                 n.type === 'coordinator' ? 'Multi-agent coordinator for chat flows' :
                 n.type === 'urlScraper' ? 'Scrape content from any website' :
                 n.type === 'youtube' ? 'Extract data and transcripts from YouTube videos' :
                 n.type === 'chatWithAnything' ? 'AI chat interface for any input' :
                 n.type === 'documentUpload' ? 'Upload and process PDF, Word, Excel documents' :
                 n.type === 'mediaUpload' ? 'Upload and analyze images and videos' :
                 n.type === 'imageGeneration' ? 'Generate images from text prompts using AI' :
                 n.type === 'imageToImage' ? 'Transform images using AI with prompts' :
                 n.type === 'textToSpeech' ? 'Convert text to speech with AI voices' :
                 n.type === 'voiceCloning' ? 'Clone voices and generate custom speech' : '',
    dragType: 'node',
    dragData: { nodeType: n.type, nodeLabel: n.label, initialData: n.defaultData },
    category: n.category,
  })),
  {
    key: 'augmented-llm',
    label: 'Augmented LLM',
    icon: <span className="text-lg font-bold text-[#fff5f5]">A</span>,
    description: 'Input → LLM+Tools → Output',
    dragType: 'pattern',
    dragData: { pattern: 'augmented-llm' },
  },
  {
    key: 'prompt-chaining',
    label: 'Prompt Chaining',
    icon: <span className="text-lg font-bold text-[#fff5f5]">C</span>,
    description: 'Input → Agent 1 → Agent 2 → Output',
    dragType: 'pattern',
    dragData: { pattern: 'prompt-chaining' },
  },
  {
    key: 'routing',
    label: 'Routing',
    icon: <span className="text-lg font-bold text-[#fff5f5]">R</span>,
    description: 'Input → Router → Agent 1/2 → Output',
    dragType: 'pattern',
    dragData: { pattern: 'routing' },
  },
  {
    key: 'parallelisation',
    label: 'Parallelisation',
    icon: <span className="text-lg font-bold text-[#fff5f5]">P</span>,
    description: 'Input → Agents (parallel) → Aggregator → Output',
    dragType: 'pattern',
    dragData: { pattern: 'parallelisation' },
  },
  {
    key: 'evaluator-optimiser',
    label: 'Evaluator-Optimiser',
    icon: <span className="text-lg font-bold text-[#fff5f5]">E</span>,
    description: 'Input → Generator → Evaluator (loop) → Output',
    dragType: 'pattern',
    dragData: { pattern: 'evaluator-optimiser' },
  },
];

  const [initialNodesLoaded, setInitialNodesLoaded] = useState(false);
  const [initialEdgesLoaded, setInitialEdgesLoaded] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [serializedGraph, setSerializedGraph] = useState<string | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  // State for sidebar visibility
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);

  // Track selected nodes
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [clipboardNodes, setClipboardNodes] = useState<Node[] | null>(null);

  // History state
  const [history, setHistory] = useState<{nodes: Node[], edges: Edge[]}[]>([]);

  // Ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params = useParams();
  const flowId = params?.flowId as string;
  const [flowName, setFlowName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [backLoading, setBackLoading] = useState(false);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('LLM');
  const [savedTemplates, setSavedTemplates] = useState<WorkflowTemplate[]>([]);
  const [savedFlowTools, setSavedFlowTools] = useState<FlowTool[]>([]);

  // Load saved templates on component mount and when templates change
  useEffect(() => {
    const loadTemplates = () => {
      // Install default templates first (only if not already installed)
      const installedCount = installDefaultTemplates();
      if (installedCount > 0) {
        console.log(`✅ Installed ${installedCount} default templates`);
      }

      setSavedTemplates(getTemplates());
    };
    loadTemplates();

    // Listen for storage changes to update templates in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TEMPLATES_STORAGE_KEY) {
        loadTemplates();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load saved flow tools on component mount and when flow tools change
  useEffect(() => {
    const loadFlowTools = () => {
      setSavedFlowTools(getFlowTools());
    };
    loadFlowTools();

    // Listen for storage changes to update flow tools in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FLOW_TOOLS_STORAGE_KEY) {
        loadFlowTools();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Create template sidebar items with enhanced display
  const templateSidebarItems = savedTemplates
    .sort((a, b) => {
      // Sort by difficulty: Beginner -> Intermediate -> Advanced
      const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
      const aDiff = (a as any).difficulty || 'Intermediate';
      const bDiff = (b as any).difficulty || 'Intermediate';
      return difficultyOrder[aDiff] - difficultyOrder[bDiff];
    })
    .map(template => {
      const extendedTemplate = template as any;
      const difficultyIcon = extendedTemplate.difficulty === 'Beginner' ? '🟢' :
                            extendedTemplate.difficulty === 'Advanced' ? '🔴' : '🟡';

      return {
        key: template.id,
        label: template.name,
        icon: <Save size={18} />,
        description: `${difficultyIcon} ${extendedTemplate.difficulty || 'Intermediate'} • ${template.description || `${template.nodes.length} nodes, ${template.edges.length} connections`}`,
        dragType: 'template' as const,
        dragData: { template },
        category: 'Saved' as const,
        difficulty: extendedTemplate.difficulty,
        estimatedTime: extendedTemplate.estimatedTime,
        tags: extendedTemplate.tags || []
      };
    });

  // Combine all sidebar items including templates
  const allSidebarItemsWithTemplates = [
    ...allSidebarItems,
    ...templateSidebarItems
  ];

  const filteredSidebarItems = allSidebarItemsWithTemplates.filter(item => {
    // Filter by category for nodes that have categories
    if (item.category) {
      return item.category === activeTab;
    }
    // For patterns (augmented-llm, etc.), show them in LLM tab for now
    return activeTab === 'LLM';
  });

  const [dropAsMetaNode, setDropAsMetaNode] = useState(false);

  const [toolsWindowOpen, setToolsWindowOpen] = useState(false);
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(false);
  const [currentComposioApiKey, setCurrentComposioApiKey] = useState('');

  // Add state for tutorial
  const [showTutorial, setShowTutorial] = useState(false);

  const [runJoyride, setRunJoyride] = useState(false);

  // Background presets - simplified to just Matrix Rain
  const backgroundPresets = [
    {
      id: "matrix-rain",
      name: "Matrix Rain",
      description: "Vertical flowing grid like digital rain",
      config: {
        width: 20,
        height: 20,
        numSquares: 60,
        maxOpacity: 0.8,
        duration: 0.8,
        flowDirection: "down" as const,
        speed: 2.5,
        gridColor: "rgba(20, 184, 166, 0.4)", // Teal color matching app theme
      },
    },
  ];

  // Color presets for easy selection
  const colorPresets = [
    { name: "App Teal", color: "rgba(20, 184, 166, 0.4)" }, // Default teal matching app theme
    { name: "Matrix Green", color: "rgba(0, 255, 65, 0.4)" },
    { name: "Electric Blue", color: "rgba(59, 130, 246, 0.4)" },
    { name: "Cyber Purple", color: "rgba(147, 51, 234, 0.4)" },
    { name: "Neon Pink", color: "rgba(236, 72, 153, 0.4)" },
    { name: "Orange Glow", color: "rgba(249, 115, 22, 0.4)" },
    { name: "Cyan Bright", color: "rgba(6, 182, 212, 0.4)" },
    { name: "Red Alert", color: "rgba(239, 68, 68, 0.4)" },
    { name: "Gold Shine", color: "rgba(245, 158, 11, 0.4)" },
  ];

  // Background settings state
  const [selectedPreset, setSelectedPreset] = useState(backgroundPresets[0]);
  const [backgroundConfig, setBackgroundConfig] = useState(backgroundPresets[0].config);
  const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(colorPresets[0].color);

  // Lock state for nodes
  const [nodesLocked, setNodesLocked] = useState(false);

  // Keyboard shortcuts for canvas navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Space + drag for panning (common in design tools)
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        document.body.style.cursor = 'grab';
      }

      // Zoom controls with keyboard shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === '=') {
        event.preventDefault();
        if (rfInstance) {
          rfInstance.zoomIn();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        if (rfInstance) {
          rfInstance.zoomOut();
        }
      }

      // Fit view with 'F' key
      if (event.key === 'f' || event.key === 'F') {
        if (rfInstance) {
          rfInstance.fitView({ padding: 0.1 });
        }
      }

      // Reset zoom with '0' key
      if (event.key === '0') {
        if (rfInstance) {
          rfInstance.setViewport({ x: 0, y: 0, zoom: 1 });
        }
      }

      // Toggle lock with 'L' key
      if (event.key === 'l' || event.key === 'L') {
        const newLockState = !nodesLocked;
        setNodesLocked(newLockState);
        setNodes(nodes => nodes.map(node => ({
          ...node,
          draggable: !newLockState
        })));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.body.style.cursor = 'default';
    };
  }, [rfInstance, nodesLocked, setNodes]);

  const updateBackgroundConfig = (key: keyof typeof backgroundConfig, value: any) => {
    setBackgroundConfig(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: typeof backgroundPresets[0]) => {
    setSelectedPreset(preset);
    setBackgroundConfig(preset.config);
    setSelectedColor(preset.config.gridColor);
  };

  const applyColorPreset = (color: string) => {
    setSelectedColor(color);
    setBackgroundConfig(prev => ({ ...prev, gridColor: color }));
  };

  const onNodeDataChange = useCallback(
    (id: string, newData: Partial<InputNodeData | LLMNodeData | ComposioNodeData | VectorStoreNodeData | HuggingFaceNodeData | DatabaseNodeData | FileStorageNodeData | MemoryNodeData | LocalLLMNodeData | AgentNodeData | CoordinatorNodeData | URLScraperNodeData | YouTubeNodeData | ChatWithAnythingNodeData | DocumentUploadNodeData | MediaUploadNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...newData, _forceRerender: Math.random() } } : node
        )
      );
    },
    [setNodes]
  );

  // Memoize callback functions to prevent nodeTypes recreation
  const copyApiKeyToAllLLMs = useCallback((apiKey: string) => {
    setNodes(nds => nds.map(n => n.type === 'llm' ? { ...n, data: { ...n.data, apiKey } } : n));
  }, [setNodes]);

  const openToolsWindow = useCallback(() => {
    setToolsWindowOpen(true);
  }, []);

  // Composio API key is now handled automatically in the backend

  const copyApiKeyToAllVectorStores = useCallback((apiKey: string) => {
    setNodes(nds => nds.map(n => n.type === 'vectorStore' ? { ...n, data: { ...n.data, apiKey } } : n));
  }, [setNodes]);

  const copyApiKeyToAllHuggingFace = useCallback((apiKey: string) => {
    setNodes(nds => nds.map(n => n.type === 'huggingFace' ? { ...n, data: { ...n.data, apiKey } } : n));
  }, [setNodes]);

  const copyConnectionToAllDatabases = useCallback((connectionString: string) => {
    setNodes(nds => nds.map(n => n.type === 'database' ? { ...n, data: { ...n.data, connectionString } } : n));
  }, [setNodes]);

  const copyCredentialsToAllFileStorage = useCallback((accessKeyId: string, secretAccessKey: string, region: string) => {
    setNodes(nds => nds.map(n => n.type === 'fileStorage' ? { ...n, data: { ...n.data, accessKeyId, secretAccessKey, region } } : n));
  }, [setNodes]);

  const copyConnectionToAllMemory = useCallback((connectionString: string) => {
    setNodes(nds => nds.map(n => n.type === 'memory' ? { ...n, data: { ...n.data, connectionString } } : n));
  }, [setNodes]);

  const copyEndpointToAllLocalLLM = useCallback((endpoint: string) => {
    setNodes(nds => nds.map(n => n.type === 'localLLM' ? { ...n, data: { ...n.data, endpoint } } : n));
  }, [setNodes]);

  const copyApiKeyToAllAgents = useCallback((apiKey: string) => {
    setNodes(nds => nds.map(n => n.type === 'agent' ? { ...n, data: { ...n.data, llmApiKey: apiKey } } : n));
  }, [setNodes]);

  const copyApiKeyToAllCoordinators = useCallback((apiKey: string) => {
    setNodes(nds => nds.map(n => n.type === 'coordinator' ? { ...n, data: { ...n.data, apiKey } } : n));
  }, [setNodes]);

  const executeWorkflowWithChat = useCallback(async (chatInput: string) => {
    const graph = handleSerializeGraph();
    if (!graph || graph.nodes.length === 0) {
      throw new Error('Graph is empty or invalid.');
    }

    setIsAgentRunning(true);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphJson: graph, chatInput }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `API request failed: ${response.status}`);
      }

      // Update chat nodes with workflow result
      setNodes(nds => nds.map(node => {
        if (node.type === 'chatWithAnything') {
          // Add the AI response to the chat
          const aiMessage = {
            role: 'assistant' as const,
            content: responseData.response || 'No response received',
            timestamp: Date.now()
          };
          const updatedMessages = [...(node.data.messages || []), aiMessage];

          return {
            ...node,
            data: {
              ...node.data,
              messages: updatedMessages,
              workflowData: responseData.response,
              isLoading: false
            }
          };
        } else if (node.type === 'customOutput') {
          return { ...node, data: { ...node.data, agentOutput: responseData.response || '' } };
        }
        return node;
      }));
    } finally {
      setIsAgentRunning(false);
    }
  }, [setIsAgentRunning, setNodes]);

  const nodeTypes: NodeTypes = useMemo(() => ({
    customInput: (props) => <InputNode {...props} data={{...props.data, onNodeDataChange: onNodeDataChange as any }} />,
    customOutput: OutputNode,
    llm: (props) => <LLMNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onCopyApiKeyToAllLLMs={copyApiKeyToAllLLMs} />,
    composio: (props) => <ComposioNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any }} onOpenToolsWindow={openToolsWindow} />,
    vectorStore: (props) => <VectorStoreNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onCopyApiKeyToAllVectorStores={copyApiKeyToAllVectorStores} />,
    huggingFace: (props) => <HuggingFaceNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onCopyApiKeyToAllHuggingFace={copyApiKeyToAllHuggingFace} />,
    database: (props) => <DatabaseNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onCopyConnectionToAllDatabases={copyConnectionToAllDatabases} />,
    fileStorage: (props) => <FileStorageNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onCopyCredentialsToAllFileStorage={copyCredentialsToAllFileStorage} />,
    memory: (props) => <MemoryNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onCopyConnectionToAllMemory={copyConnectionToAllMemory} />,
    localLLM: (props) => <LocalLLMNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onCopyEndpointToAllLocalLLM={copyEndpointToAllLocalLLM} />,
    agent: (props) => <AgentNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any }} onOpenToolsWindow={openToolsWindow} onCopyApiKeyToAllAgents={copyApiKeyToAllAgents} />,
    coordinator: (props) => <CoordinatorNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onCopyApiKeyToAllCoordinators={copyApiKeyToAllCoordinators} />,
    urlScraper: (props) => <URLScraperNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} />,
    youtube: (props) => <YouTubeNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} />,
    chatWithAnything: (props) => <ChatWithAnythingNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} onExecuteWorkflow={executeWorkflowWithChat} />,
    documentUpload: (props) => <DocumentUploadNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} />,
    mediaUpload: (props) => <MediaUploadNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} />,
    imageGeneration: (props) => <ImageGenerationNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} />,
    imageToImage: (props) => <ImageToImageNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} />,
    textToSpeech: (props) => <TextToSpeechNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} />,
    voiceCloning: (props) => <VoiceCloningNode {...props} data={{ ...props.data, onNodeDataChange: onNodeDataChange as any}} />,
    patternMeta: PatternMetaNode,
  }), [
    onNodeDataChange,
    copyApiKeyToAllLLMs,
    openToolsWindow,
    copyApiKeyToAllVectorStores,
    copyApiKeyToAllHuggingFace,
    copyConnectionToAllDatabases,
    copyCredentialsToAllFileStorage,
    copyConnectionToAllMemory,
    copyEndpointToAllLocalLLM,
    copyApiKeyToAllAgents,
    copyApiKeyToAllCoordinators,
    executeWorkflowWithChat
  ]);

  const edgeTypes = useMemo(() => ({
    flowing: FlowingEdge,
  }), []);

  useEffect(() => {
    const fetchFlowName = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Get all flows for this user to determine index
      const { data: flows } = await supabase
        .from('flows')
        .select('id, name')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!flows) return;
      const thisFlow = flows.find(f => f.id === flowId);
      let name = thisFlow?.name || '';
      if (!name) {
        const idx = flows.findIndex(f => f.id === flowId);
        name = `Flow - ${idx + 1}`;
        await supabase.from('flows').update({ name }).eq('id', flowId);
      }
      setFlowName(name);
    };
    fetchFlowName();
  }, [flowId]);

  const handleNameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditingName(false);
    const supabase = createClient();
    await supabase.from('flows').update({ name: flowName }).eq('id', flowId);
  };

  const handleNameBlur = async () => {
    setEditingName(false);
    const supabase = createClient();
    await supabase.from('flows').update({ name: flowName }).eq('id', flowId);
  };

  // Helper to push current state to history
  const pushToHistory = useCallback(() => {
    setHistory((h) => [...h, { nodes, edges }]);
  }, [nodes, edges]);

  // Wrap onNodesChange to push to history
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    pushToHistory();
    onNodesChange(changes);
  }, [onNodesChange, pushToHistory]);

  // Wrap onEdgesChange to push to history
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    pushToHistory();
    onEdgesChange(changes);
  }, [onEdgesChange, pushToHistory]);

  // Undo handler
  useEffect(() => {
    const handleUndo = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (history.length > 0) {
          const prev = history[history.length - 1];
          setNodes(prev.nodes);
          setEdges(prev.edges);
          setHistory((h) => h.slice(0, -1));
        }
      }
    };
    window.addEventListener('keydown', handleUndo);
    return () => window.removeEventListener('keydown', handleUndo);
  }, [history, setNodes, setEdges]);

  useEffect(() => {
    const fetchFlowData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: flow, error } = await supabase
        .from('flows')
        .select('graph_json')
        .eq('id', flowId)
        .single();
      if (flow && flow.graph_json) {
        setNodes(flow.graph_json.nodes || []);
        setEdges(flow.graph_json.edges || []);
      }
      setInitialNodesLoaded(true);
      setInitialEdgesLoaded(true);
      setLoading(false);
    };
    fetchFlowData();
  }, [flowId]);

  useEffect(() => {
    if (!initialNodesLoaded || !initialEdgesLoaded) return;
    const updateFlow = async () => {
      const supabase = createClient();
      await supabase.from('flows').update({ graph_json: { nodes, edges } }).eq('id', flowId);
    };
    updateFlow();
  }, [nodes, edges, flowId, initialNodesLoaded, initialEdgesLoaded]);

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      console.log('[Builder Debug] Connection made:', params);
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        console.log('[Builder Debug] Updated edges:', newEdges);
        return newEdges;
      });
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Helper to generate nodes/edges for each pattern
  function getPatternNodesAndEdges(patternType: string, position: XYPosition, getUniqueNodeId: (type: string) => string, onNodeDataChange: any) {
    // Offset helpers for layout
    const x = position.x;
    const y = position.y;
    const hSpacing = 340; // horizontal spacing between nodes
    const vSpacing = 140; // vertical spacing for branches
    if (patternType === 'augmented-llm') {
      const inputId = getUniqueNodeId('customInput');
      const llmId = getUniqueNodeId('llm');
      const outputId = getUniqueNodeId('customOutput');
      return {
        nodes: [
          { id: inputId, type: 'customInput', position: { x, y }, data: { label: 'Input', query: '', onNodeDataChange } },
          { id: llmId, type: 'llm', position: { x: x + hSpacing, y }, data: { label: 'LLM', systemPrompt: '', apiKey: '', onNodeDataChange } },
          { id: outputId, type: 'customOutput', position: { x: x + hSpacing * 2, y }, data: { label: 'Output' } },
        ],
        edges: [
          { id: getUniqueNodeId('e'), source: inputId, target: llmId },
          { id: getUniqueNodeId('e'), source: llmId, target: outputId },
        ]
      };
    }
    if (patternType === 'prompt-chaining') {
      const inputId = getUniqueNodeId('customInput');
      const agent1Id = getUniqueNodeId('agent');
      const agent2Id = getUniqueNodeId('agent');
      const outputId = getUniqueNodeId('customOutput');
      return {
        nodes: [
          { id: inputId, type: 'customInput', position: { x, y }, data: { label: 'Input', query: '', onNodeDataChange } },
          { id: agent1Id, type: 'agent', position: { x: x + hSpacing, y }, data: { label: 'Agent 1', onNodeDataChange } },
          { id: agent2Id, type: 'agent', position: { x: x + hSpacing * 2, y }, data: { label: 'Agent 2', onNodeDataChange } },
          { id: outputId, type: 'customOutput', position: { x: x + hSpacing * 3, y }, data: { label: 'Output' } },
        ],
        edges: [
          { id: getUniqueNodeId('e'), source: inputId, target: agent1Id },
          { id: getUniqueNodeId('e'), source: agent1Id, target: agent2Id },
          { id: getUniqueNodeId('e'), source: agent2Id, target: outputId },
        ]
      };
    }
    if (patternType === 'routing') {
      const inputId = getUniqueNodeId('customInput');
      const routerId = getUniqueNodeId('agent');
      const agent1Id = getUniqueNodeId('agent');
      const agent2Id = getUniqueNodeId('agent');
      const outputId = getUniqueNodeId('customOutput');
      return {
        nodes: [
          { id: inputId, type: 'customInput', position: { x, y: y + vSpacing }, data: { label: 'Input', query: '', onNodeDataChange } },
          { id: routerId, type: 'agent', position: { x: x + hSpacing, y: y + vSpacing }, data: { label: 'Router', onNodeDataChange } },
          { id: agent1Id, type: 'agent', position: { x: x + hSpacing * 2, y: y }, data: { label: 'Agent 1', onNodeDataChange } },
          { id: agent2Id, type: 'agent', position: { x: x + hSpacing * 2, y: y + vSpacing * 2 }, data: { label: 'Agent 2', onNodeDataChange } },
          { id: outputId, type: 'customOutput', position: { x: x + hSpacing * 3, y: y + vSpacing }, data: { label: 'Output' } },
        ],
        edges: [
          { id: getUniqueNodeId('e'), source: inputId, target: routerId },
          { id: getUniqueNodeId('e'), source: routerId, target: agent1Id },
          { id: getUniqueNodeId('e'), source: routerId, target: agent2Id },
          { id: getUniqueNodeId('e'), source: agent1Id, target: outputId },
          { id: getUniqueNodeId('e'), source: agent2Id, target: outputId },
        ]
      };
    }
    if (patternType === 'parallelisation') {
      const inputId = getUniqueNodeId('customInput');
      const agent1Id = getUniqueNodeId('agent');
      const agent2Id = getUniqueNodeId('agent');
      const aggregatorId = getUniqueNodeId('llm');
      const outputId = getUniqueNodeId('customOutput');
      return {
        nodes: [
          { id: inputId, type: 'customInput', position: { x, y: y + vSpacing }, data: { label: 'Input', query: '', onNodeDataChange } },
          { id: agent1Id, type: 'agent', position: { x: x + hSpacing, y: y }, data: { label: 'Agent 1', onNodeDataChange } },
          { id: agent2Id, type: 'agent', position: { x: x + hSpacing, y: y + vSpacing * 2 }, data: { label: 'Agent 2', onNodeDataChange } },
          { id: aggregatorId, type: 'llm', position: { x: x + hSpacing * 2, y: y + vSpacing }, data: { label: 'Aggregator', onNodeDataChange } },
          { id: outputId, type: 'customOutput', position: { x: x + hSpacing * 3, y: y + vSpacing }, data: { label: 'Output' } },
        ],
        edges: [
          { id: getUniqueNodeId('e'), source: inputId, target: agent1Id },
          { id: getUniqueNodeId('e'), source: inputId, target: agent2Id },
          { id: getUniqueNodeId('e'), source: agent1Id, target: aggregatorId },
          { id: getUniqueNodeId('e'), source: agent2Id, target: aggregatorId },
          { id: getUniqueNodeId('e'), source: aggregatorId, target: outputId },
        ]
      };
    }
    if (patternType === 'evaluator-optimiser') {
      const inputId = getUniqueNodeId('customInput');
      const generatorId = getUniqueNodeId('llm');
      const solutionId = getUniqueNodeId('customOutput');
      const evaluatorId = getUniqueNodeId('llm');
      return {
        nodes: [
          { id: inputId, type: 'customInput', position: { x, y }, data: { label: 'Input', query: '', onNodeDataChange } },
          { id: generatorId, type: 'llm', position: { x: x + hSpacing, y }, data: { label: 'Generator', onNodeDataChange } },
          { id: solutionId, type: 'customOutput', position: { x: x + hSpacing * 2, y }, data: { label: 'Solution' } },
          { id: evaluatorId, type: 'llm', position: { x: x + hSpacing, y: y + vSpacing }, data: { label: 'Evaluator', onNodeDataChange } },
        ],
        edges: [
          { id: getUniqueNodeId('e'), source: inputId, target: generatorId },
          { id: getUniqueNodeId('e'), source: generatorId, target: solutionId },
          { id: getUniqueNodeId('e'), source: generatorId, target: evaluatorId },
          { id: getUniqueNodeId('e'), source: evaluatorId, target: generatorId },
        ]
      };
    }
    return { nodes: [], edges: [] };
  }

  const expandPatternMetaNode = (metaNodeId: string, patternType: string, position: XYPosition) => {
    const { nodes: patternNodes, edges: patternEdges } = getPatternNodesAndEdges(patternType, position, getUniqueNodeId, onNodeDataChange);
    // Compute nodeIds and edgeIds for collapse
    const nodeIds = patternNodes.map(n => n.id);
    const edgeIds = patternEdges.map(e => e.id);
    // Compute centroid for collapse
    const centroid = patternNodes.reduce((acc, n) => ({ x: acc.x + n.position.x, y: acc.y + n.position.y }), { x: 0, y: 0 });
    centroid.x /= patternNodes.length;
    centroid.y /= patternNodes.length;
    // Get label/description
    let label = '';
    let description = '';
    if (patternType === 'augmented-llm') {
      label = 'Augmented LLM';
      description = 'Input → LLM+Tools → Output';
    } else if (patternType === 'prompt-chaining') {
      label = 'Prompt Chaining';
      description = 'Input → Agent 1 → Agent 2 → Output';
    } else if (patternType === 'routing') {
      label = 'Routing';
      description = 'Input → Router → Agent 1/2 → Output';
    } else if (patternType === 'parallelisation') {
      label = 'Parallelisation';
      description = 'Input → Agents (parallel) → Aggregator → Output';
    } else if (patternType === 'evaluator-optimiser') {
      label = 'Evaluator-Optimiser';
      description = 'Input → Generator → Evaluator (loop) → Output';
    }
    // Pass onCollapse to each node's data
    const nodesWithCollapse = patternNodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onCollapse: () => collapsePattern(patternType, nodeIds, edgeIds, centroid, label, description)
      }
    }));
    setNodes(nds => nds.filter(n => n.id !== metaNodeId).concat(nodesWithCollapse));
    setEdges(eds => eds.concat(patternEdges));
  };

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (!rfInstance) return;

      // Pattern drop logic
      const patternType = event.dataTransfer.getData('application/pattern');
      if (patternType) {
        const position: XYPosition = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        if (dropAsMetaNode) {
          // Insert a PatternMetaNode
          let label = '';
          let description = '';
          if (patternType === 'augmented-llm') {
            label = 'Augmented LLM';
            description = 'Input → LLM+Tools → Output';
          } else if (patternType === 'prompt-chaining') {
            label = 'Prompt Chaining';
            description = 'Input → Agent 1 → Agent 2 → Output';
          } else if (patternType === 'routing') {
            label = 'Routing';
            description = 'Input → Router → Agent 1/2 → Output';
          } else if (patternType === 'parallelisation') {
            label = 'Parallelisation';
            description = 'Input → Agents (parallel) → Aggregator → Output';
          } else if (patternType === 'evaluator-optimiser') {
            label = 'Evaluator-Optimiser';
            description = 'Input → Generator → Evaluator (loop) → Output';
          }
          setNodes(nds => nds.concat({
            id: getUniqueNodeId('patternMeta'),
            type: 'patternMeta',
            position,
            data: { patternType, label, description, onExpand: (id: string) => {
              expandPatternMetaNode(id, patternType, position);
            } },
          }));
          return;
        }
        // Expanded pattern logic
        const { nodes: patternNodes, edges: patternEdges } = getPatternNodesAndEdges(patternType, position, getUniqueNodeId, onNodeDataChange);
        setNodes(nds => nds.concat(patternNodes));
        setEdges(eds => eds.concat(patternEdges));
        return;
      }

      // Template drop logic
      const templateData = event.dataTransfer.getData('application/template');
      if (templateData) {
        try {
          const template: WorkflowTemplate = JSON.parse(templateData);
          const position: XYPosition = rfInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          // Calculate offset to position template at drop location
          const templateNodes = template.nodes;
          if (templateNodes.length > 0) {
            // Find the top-left corner of the template
            const minX = Math.min(...templateNodes.map(n => n.position.x));
            const minY = Math.min(...templateNodes.map(n => n.position.y));
            const offsetX = position.x - minX;
            const offsetY = position.y - minY;

            // Create new nodes with updated positions and IDs
            const newNodes = templateNodes.map(node => ({
              ...node,
              id: getUniqueNodeId(node.type || 'node'),
              position: {
                x: node.position.x + offsetX,
                y: node.position.y + offsetY,
              },
              data: {
                ...node.data,
                onNodeDataChange: onNodeDataChange,
              },
            }));

            // Create new edges with updated node IDs
            const nodeIdMap = new Map();
            templateNodes.forEach((oldNode, index) => {
              nodeIdMap.set(oldNode.id, newNodes[index].id);
            });

            const newEdges = template.edges.map(edge => ({
              ...edge,
              id: getUniqueNodeId('e'),
              source: nodeIdMap.get(edge.source) || edge.source,
              target: nodeIdMap.get(edge.target) || edge.target,
            }));

            // Add nodes and edges to the canvas
            setNodes(nds => nds.concat(newNodes));
            setEdges(eds => eds.concat(newEdges));
          }
        } catch (error) {
          console.error('Error parsing template data:', error);
          alert('Failed to load template');
        }
        return;
      }

      // Node drop logic
      const type = event.dataTransfer.getData('application/reactflow');
      const initialNodeDataJSON = event.dataTransfer.getData('application/nodeInitialData');
      const initialNodeData = JSON.parse(initialNodeDataJSON || '{}');
      if (typeof type === 'undefined' || !type) return;
      const position: XYPosition = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      let nodeData: any = { ...initialNodeData };
      if (type === 'customInput' || type === 'llm' || type === 'composio' || type === 'urlScraper' || type === 'youtube' || type === 'chatWithAnything' || type === 'documentUpload' || type === 'mediaUpload') {
        nodeData.onNodeDataChange = onNodeDataChange;
      }
      const newNode: Node = {
        id: getUniqueNodeId(type),
        type,
        position,
        data: nodeData,
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance, setNodes, onNodeDataChange, dropAsMetaNode]
  );
  
  const onDragStart = (event: DragEvent, nodeType: string, nodeLabel: string, initialData: object) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/nodeInitialData', JSON.stringify(initialData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSerializeGraph = (forSave = false) => {
    // Ensure callbacks are removed before serialization
    const nodesToSerialize = nodes.map(node => ({
      ...node,
      data: { ...node.data, onNodeDataChange: undefined }
    }));
    const graph = {
      nodes: nodesToSerialize,
      edges,
    };
    const json = JSON.stringify(graph, null, 2);
    if (!forSave) {
      setSerializedGraph(json);
      console.log("Serialized Graph for Backend:", json); // Log the structure being sent
    }
    return graph;
  };

  // Save current workflow as template
  const handleSaveAsTemplate = () => {
    if (nodes.length === 0) {
      alert('Cannot save empty workflow as template');
      return;
    }

    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    const templateDescription = prompt('Enter template description (optional):') || '';

    const template: WorkflowTemplate = {
      id: `template_${Date.now()}`,
      name: templateName,
      description: templateDescription,
      nodes: nodes.map(node => ({
        ...node,
        data: { ...node.data, onNodeDataChange: undefined }
      })),
      edges: edges,
      created: new Date().toISOString(),
      category: 'Saved'
    };

    saveTemplate(template);
    setSavedTemplates(getTemplates()); // Refresh templates list
    alert(`Template "${templateName}" saved successfully!`);
  };

  // Delete template function
  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    if (confirm(`Are you sure you want to delete template "${templateName}"?`)) {
      deleteTemplate(templateId);
      setSavedTemplates(getTemplates()); // Refresh templates list
    }
  };

  // Save current workflow as flow tool (only for orchestrator flows)
  const handleSaveAsFlowTool = () => {
    if (nodes.length === 0) {
      alert('Cannot save empty workflow as flow tool');
      return;
    }

    // Check if flow contains orchestrator nodes
    const hasOrchestratorNode = nodes.some(node =>
      (node.type === 'llm' && node.data.modelProvider === 'orchestrator') ||
      (node.type === 'agent' && node.data.modelProvider === 'orchestrator')
    );

    if (!hasOrchestratorNode) {
      alert('Flow tools must contain at least one node with orchestrator provider');
      return;
    }

    const toolName = prompt('Enter flow tool name:');
    if (!toolName) return;

    const toolDescription = prompt('Enter flow tool description (optional):') || '';
    const triggerKeywords = prompt('Enter trigger keywords (comma-separated):') || '';

    const flowTool: FlowTool = {
      id: `flowtool_${Date.now()}`,
      name: toolName,
      description: toolDescription,
      nodes: nodes.map(node => ({
        ...node,
        data: { ...node.data, onNodeDataChange: undefined }
      })),
      edges: edges,
      created: new Date().toISOString(),
      category: 'Saved',
      isActive: false, // Start inactive by default
      executionEndpoint: '/api/orchestrator/flow-tool/execute',
      triggerKeywords: triggerKeywords.split(',').map(k => k.trim()).filter(k => k),
      toolType: 'flow-tool',
      usageCount: 0
    };

    saveFlowTool(flowTool);
    setSavedFlowTools(getFlowTools()); // Refresh flow tools list
    alert(`Flow tool "${toolName}" saved successfully! You can activate it in the Witz navigation menu.`);
  };

  // Delete flow tool function
  const handleDeleteFlowTool = (toolId: string, toolName: string) => {
    if (confirm(`Are you sure you want to delete flow tool "${toolName}"?`)) {
      deleteFlowTool(toolId);
      setSavedFlowTools(getFlowTools()); // Refresh flow tools list
    }
  };

  // Save current workflow as agent flow (only for coordinator flows)
  const handleSaveAsAgentFlow = () => {
    if (nodes.length === 0) {
      alert('Cannot save empty workflow as agent flow');
      return;
    }

    // Check if flow contains coordinator nodes
    const hasCoordinatorNode = nodes.some(node =>
      (node.type === 'coordinator' && node.data.modelProvider === 'coordinator')
    );

    if (!hasCoordinatorNode) {
      alert('Agent flows must contain at least one coordinator node');
      return;
    }

    // Get agent name from coordinator node
    const coordinatorNode = nodes.find(node =>
      node.type === 'coordinator' && node.data.modelProvider === 'coordinator'
    );

    const defaultAgentName = coordinatorNode?.data?.agentName || '';
    const agentName = prompt('Enter agent name:', defaultAgentName);
    if (!agentName) return;

    const agentDescription = prompt('Enter agent description (optional):', coordinatorNode?.data?.agentDescription || '') || '';
    const capabilities = prompt('Enter agent capabilities (optional):', coordinatorNode?.data?.capabilities || '') || '';

    const agentFlow: FlowTool = {
      id: `agentflow_${Date.now()}`,
      name: agentName,
      description: agentDescription,
      nodes: nodes.map(node => ({
        ...node,
        data: { ...node.data, onNodeDataChange: undefined }
      })),
      edges: edges,
      created: new Date().toISOString(),
      category: 'Agent',
      isActive: false, // Start inactive by default
      executionEndpoint: '/api/orchestrator/agent-flow/execute',
      triggerKeywords: [], // Agent flows are called by name, not keywords
      toolType: 'pydantic-agent-flow',
      usageCount: 0,
      capabilities: capabilities.split(',').map(c => c.trim()).filter(c => c),
      agentType: 'pydantic-coordinator'
    };

    saveFlowTool(agentFlow); // Reuse existing storage system
    setSavedFlowTools(getFlowTools()); // Refresh flow tools list
    alert(`Agent flow "${agentName}" saved successfully! You can activate it in the AI Agents section.`);
  };

  // --- Share Workflow Logic ---
  const handleShareWorkflow = () => {
    const graphToSave = handleSerializeGraph(true); // Serialize without updating the state
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(graphToSave, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "workflow.json";
    link.click();
  };

  // --- Upload Workflow Logic ---
  const handleUploadClick = () => {
    fileInputRef.current?.click(); // Trigger the hidden file input
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Failed to read file content.");

        const parsedGraph = JSON.parse(text);

        // Basic validation
        if (!parsedGraph || !Array.isArray(parsedGraph.nodes) || !Array.isArray(parsedGraph.edges)) {
          throw new Error("Invalid workflow file format. Missing 'nodes' or 'edges' array.");
        }

        // TODO: Add more robust validation if needed (e.g., check node types, data structure)

        // Restore the onNodeDataChange callback
        const restoredNodes = parsedGraph.nodes.map((node: Node) => ({
          ...node,
          data: { ...node.data, onNodeDataChange: onNodeDataChange },
        }));

        pushToHistory(); // Save current state before overwriting
        setNodes(restoredNodes);
        setEdges(parsedGraph.edges);

        // Clear the input value so the same file can be uploaded again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        alert("Workflow loaded successfully!");

      } catch (error: any) {
        console.error("Error loading workflow:", error);
        alert(`Failed to load workflow: ${error.message}`);
        // Clear the input value on error too
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = (e) => {
      console.error("FileReader error:", e);
      alert("Error reading file.");
       if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
    };
    reader.readAsText(file);
  };

  // --- Play Button Logic ---
  const handleRunAgentFromBuilder = async () => {
    const graph = handleSerializeGraph();
    if (!graph || graph.nodes.length === 0) {
      alert("Graph is empty or invalid.");
      return;
    }
    const inputNode = graph.nodes.find(node => node.type === 'customInput') as Node<InputNodeData> | undefined;
    if (!inputNode) {
      alert("Please add an Input Node to your flow.");
      return;
    }
    // Check if input node has query OR is in chat mode
    if (!inputNode.data?.query && !inputNode.data?.chatMode) {
      alert("Please provide a query in the Input Node or enable Chat Mode.");
      return;
    }
    setIsAgentRunning(true);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphJson: graph }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `API request failed: ${response.status}`);
      }
      // Set result in output node
      setNodes(nds => nds.map(node =>
        node.type === 'customOutput'
          ? { ...node, data: { ...node.data, agentOutput: responseData.response || '' } }
          : node
      ));
    } catch (error: any) {
      setNodes(nds => nds.map(node =>
        node.type === 'customOutput'
          ? { ...node, data: { ...node.data, agentOutput: error.message } }
          : node
      ));
    } finally {
      setIsAgentRunning(false);
    }
  };



  // Advanced: ReactFlow onNodeDrag/onNodeDragStop handlers
  const onNodeDrag: NodeDragHandler = useCallback((event, node) => {
    // Use mouse position for dustbin overlap
    if (event && 'clientX' in event && 'clientY' in event) {
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      // Use mouse position for dustbin overlap
      let shouldDelete = false;
      if (event && 'clientX' in event && 'clientY' in event) {
        const dustbinRect = { left: 0, right: 0, top: 0, bottom: 0 };
        if (
          mouseX > dustbinRect.left &&
          mouseX < dustbinRect.right &&
          mouseY > dustbinRect.top &&
          mouseY < dustbinRect.bottom
        ) {
          shouldDelete = true;
        }
      }
      if (shouldDelete) {
        setNodes((nds) => nds.filter((n) => n.id !== node.id));
      }
    }
  }, []);

  const onNodeDragStop: NodeDragHandler = useCallback((event, node) => {
    // Use mouse position for dustbin overlap
    let shouldDelete = false;
    if (event && 'clientX' in event && 'clientY' in event) {
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      const dustbinRect = { left: 0, right: 0, top: 0, bottom: 0 };
      if (
        mouseX > dustbinRect.left &&
        mouseX < dustbinRect.right &&
        mouseY > dustbinRect.top &&
        mouseY < dustbinRect.bottom
      ) {
        shouldDelete = true;
      }
    }
    if (shouldDelete) {
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
    }
  }, [setNodes]);

  // Track selected nodes
  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
    setSelectedNodes(selected);
  }, []);

  // Copy selected nodes to clipboard
  useEffect(() => {
    const handleCopy = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedNodes.length > 0) {
          setClipboardNodes(selectedNodes.map(n => ({ ...n })));
        }
      }
    };
    window.addEventListener('keydown', handleCopy);
    return () => window.removeEventListener('keydown', handleCopy);
  }, [selectedNodes]);

  // Paste nodes from clipboard
  useEffect(() => {
    const handlePaste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboardNodes && clipboardNodes.length > 0) {
          const offset = 40;
          const newNodes = clipboardNodes.map((node) => {
            const newId = getUniqueNodeId(node.type || 'node');
            return {
              ...node,
              id: newId,
              position: {
                x: (node.position?.x || 0) + offset,
                y: (node.position?.y || 0) + offset,
              },
              selected: false,
              data: { ...node.data },
            };
          });
          setNodes((nds) => nds.concat(newNodes));
        }
      }
    };
    window.addEventListener('keydown', handlePaste);
    return () => window.removeEventListener('keydown', handlePaste);
  }, [clipboardNodes, setNodes]);

  const onEdgeClick = useCallback((event: any, edge: any) => {
    event.stopPropagation();
    setSelectedEdgeId(prevId => prevId === edge.id ? null : edge.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
  }, []);

  // Add collapsePattern helper
  function collapsePattern(patternType: string, nodeIds: string[], edgeIds: string[], centroid: XYPosition, label: string, description: string) {
    setNodes(nds => nds.filter(n => !nodeIds.includes(n.id)).concat({
      id: getUniqueNodeId('patternMeta'),
      type: 'patternMeta',
      position: centroid,
      data: { patternType, label, description, onExpand: (id: string) => {
        expandPatternMetaNode(id, patternType, centroid);
      }, onCollapse: undefined },
    }));
    setEdges(eds => eds.filter(e => !edgeIds.includes(e.id)));
  }

  // Highlight selected nodes and add running animation
  const highlightedNodes = nodes.map(node => {
    if (isAgentRunning) {
      return {
        ...node,
        data: {
          ...node.data,
          selected: node.selected
        },
        style: {
          ...(node.style || {}),
          animation: 'glowingNode 4s linear infinite',
          boxShadow: '0 0 10px rgba(255, 245, 245, 0.3)',
          border: '1px solid rgba(255, 245, 245, 0.5)',
          transition: 'all 0.3s ease-in-out',
        }
      };
    }
    return node.selected
      ? {
          ...node,
          data: {
            ...node.data,
            selected: node.selected
          },
          style: {
            ...(node.style || {}),
            border: '2px solid #b3b3b3',
            borderRadius: '0.5rem',
            boxShadow: '0 0 0 4px rgba(179,179,179,0.18), 0 0 12px 2px #b3b3b3',
            zIndex: 10,
            transition: 'box-shadow 0.2s, border-color 0.2s',
          }
        }
      : {
          ...node,
          data: {
            ...node.data,
            selected: node.selected
          }
        };
  });

  // Keyboard shortcuts for selected nodes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        (active as HTMLElement).isContentEditable
      );
      // Delete selected nodes
      if (!isInput && (e.key === 'Backspace' || e.key === 'Delete') && selectedNodes.length > 0) {
        setNodes(nds => nds.filter(n => !selectedNodes.some(sel => sel.id === n.id)));
        setEdges(eds => eds.filter(e => !selectedNodes.some(sel => sel.id === e.source || sel.id === e.target)));
        setSelectedNodes([]);
      }
      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNodes.length > 0) {
        setClipboardNodes(selectedNodes.map(n => ({ ...n })));
      }
      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardNodes && clipboardNodes.length > 0) {
        const offset = 40;
        const newNodes = clipboardNodes.map((node) => {
          const newId = getUniqueNodeId(node.type || 'node');
          return {
            ...node,
            id: newId,
            position: {
              x: (node.position?.x || 0) + offset,
              y: (node.position?.y || 0) + offset,
            },
            selected: false,
            data: { ...node.data },
          };
        });
        setNodes((nds) => nds.concat(newNodes));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, clipboardNodes]);

  // Handler for ToolsWindow to add actions to the selected node
  const handleAddActionsToAgent = (actions: any[]) => {
    if (!selectedNodes || selectedNodes.length === 0) return;
    const node = selectedNodes.find((n: Node) => n.type === 'agent' || n.type === 'composio');
    if (!node) return;
    // Compose action keys as comma-separated string
    const actionKeys = actions.map(a => a.name).join(',');
    setNodes(nds => nds.map((n: Node) => {
      if (n.id === node.id) {
        return {
          ...n,
          data: {
            ...n.data,
            allowedTools: actionKeys,
            toolActions: actionKeys,
          }
        };
      }
      return n;
    }));
    setToolsWindowOpen(false);
  };

  // Helper to get composioApiKey from selected node
  const getSelectedComposioApiKey = () => {
    if (!selectedNodes || selectedNodes.length === 0) return '';
    const node = selectedNodes.find((n: Node) => n.type === 'agent' || n.type === 'composio');
    if (!node) return '';
    if (node.type === 'agent') return node.data.composioApiKey || '';
    if (node.type === 'composio') return node.data.composioApiKey || '';
    return '';
  };

  // Check if tutorial should be shown on mount
  useEffect(() => {
    const shouldShowTutorial = localStorage.getItem('showBuilderTutorial');
    if (shouldShowTutorial === 'true') {
      setTimeout(() => {
        setRunJoyride(true);
        localStorage.removeItem('showBuilderTutorial');
      }, 500);
    }
  }, []);

  // Add tutorial completion handler
  const handleTutorialComplete = () => {
    setRunJoyride(false);
  };

  const joyrideSteps = [
    {
      target: '.overflow-y-auto.transition-all',
      content: 'This is the Node Library. Drag nodes onto the canvas to build your flow.',
      placement: 'right' as const,
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="canvas"]',
      content: 'This is your canvas. Connect nodes to define your workflow.',
      placement: 'center' as const,
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="run-agent"]',
      content: 'Click here to run your agent once your flow is ready!',
      placement: 'bottom' as const,
      disableBeacon: true,
    },
  ];

  if (backLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ 
      background: '#000000',
      color: '#fff5f5',
      backdropFilter: 'blur(10px)',
    }}>
      <Joyride
        steps={joyrideSteps}
        run={runJoyride}
        continuous
        showSkipButton
        showProgress
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#111',
            textColor: '#222',
            backgroundColor: '#fff',
          },
        }}
        callback={data => {
          if (data.status === 'finished' || data.status === 'skipped') {
            setRunJoyride(false);
          }
        }}
      />

      {/* Top Bar */}
      <header className="h-16 flex items-center justify-between px-6 shrink-0" style={{ 
        background: 'rgba(0, 0, 0, 0.7)',
        borderBottom: '1px solid rgba(255, 245, 245, 0.2)',
        backdropFilter: 'blur(10px)',
      }}>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.from('flows').update({ graph_json: { nodes, edges } }).eq('id', flowId);
              router.push('/dashboard');
            }}
            className="p-1.5 rounded-md transition-all duration-200 hover:bg-[#fff5f5]/20 hover:scale-105"
            style={{
              background: 'rgba(255, 245, 245, 0.1)',
              color: '#fff5f5',
              backdropFilter: 'blur(5px)',
            }}
            title="Back to Dashboard"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          {editingName ? (
            <form onSubmit={handleNameSubmit} className="ml-2">
              <input
                autoFocus
                value={flowName}
                onChange={e => setFlowName(e.target.value)}
                onBlur={handleNameBlur}
                className="text-xl font-semibold bg-transparent border-b border-primary text-[#fff5f5] focus:outline-none px-1 w-48 focus:text-[#fff5f5] hover:text-[#fff5f5]"
              />
            </form>
          ) : (
            <span
              className="text-xl font-semibold text-[#fff5f5] ml-2 cursor-pointer hover:text-[#fff5f5]"
              onDoubleClick={() => setEditingName(true)}
              title="Double click to rename"
            >
              {flowName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Upload Button - Triggers hidden input */}
          <button
            onClick={handleUploadClick}
            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 hover:bg-[#fff5f5]/20 hover:scale-105"
            style={{
              background: 'rgba(255, 245, 245, 0.1)',
              color: '#fff5f5',
              backdropFilter: 'blur(5px)',
            }}
            title="Load workflow from JSON file"
          >
            <Upload size={16} /> Upload
          </button>
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
          {/* Save as Template Button */}
          <button
            onClick={handleSaveAsTemplate}
            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 hover:bg-[#fff5f5]/20 hover:scale-105"
            style={{
              background: 'rgba(255, 245, 245, 0.1)',
              color: '#fff5f5',
              backdropFilter: 'blur(5px)',
            }}
            title="Save current workflow as reusable template"
          >
            <Save size={16} /> Save Template
          </button>
          {/* Save as Flow Tool Button */}
          <button
            onClick={handleSaveAsFlowTool}
            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 hover:bg-[#5eead4]/20 hover:scale-105"
            style={{
              background: 'rgba(94, 234, 212, 0.1)',
              color: '#5eead4',
              backdropFilter: 'blur(5px)',
            }}
            title="Save current workflow as flow tool for main chat (requires orchestrator nodes)"
          >
            <Save size={16} /> Save Flow Tool
          </button>
          {/* Save as Agent Flow Button */}
          <button
            onClick={handleSaveAsAgentFlow}
            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 hover:bg-[#9333ea]/20 hover:scale-105"
            style={{
              background: 'rgba(147, 51, 234, 0.1)',
              color: '#9333ea',
              backdropFilter: 'blur(5px)',
            }}
            title="Save current workflow as agent flow for multi-agent mode (requires coordinator nodes)"
          >
            <Save size={16} /> Save Agent Flow
          </button>
          {/* Run Agent Button */}
          <button
            data-tutorial="run-agent"
            onClick={handleRunAgentFromBuilder}
            disabled={isAgentRunning}
            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 hover:bg-white/20 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              backdropFilter: 'blur(5px)',
            }}
            title="Run Agent from Flow"
          >
            {isAgentRunning ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Run Agent</span>
              </>
            )}
          </button>
          {/* Agent Builder Button */}
          <div className="inline-block">
            <AgentBuilder onSubmit={async (data, close) => {
              // Call PydanticAI Orchestrator via Agent Flow API route
              const res = await fetch('/api/chat-to-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  useCase: data.description,
                  usePydanticAI: true, // Use PydanticAI orchestrator
                })
              });
              if (!res.ok) {
                let errorMsg = 'Failed to generate agent flow';
                try {
                  const err = await res.json();
                  if (err.error && err.details) {
                    errorMsg = `${err.error}: ${err.details}`;
                  } else if (err.error) {
                    errorMsg = err.error;
                  }
                } catch {}
                alert(errorMsg);
                return;
              }
              const result = await res.json();
              if (result.nodes && result.edges) {
                // Clear existing nodes and edges
                setNodes([]);
                setEdges([]);

                // Add new nodes and edges from generated graph
                setTimeout(() => {
                  setNodes(result.nodes.map((node: any) => ({
                    ...node,
                    data: { ...node.data, onNodeDataChange }
                  })));
                  setEdges(result.edges);
                }, 100);

                close();
              } else {
                alert(`Failed to generate agent flow: ${result.error || 'Unknown error'}`);
              }
            }} />
          </div>
        </div>
      </header>

      {/* Move sidebar toggle below navbar */}
      <div className="flex items-center px-6 py-2" style={{background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,245,245,0.1)', backdropFilter: 'blur(10px)'}}>
        <button 
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          className="p-1.5 rounded-md transition-all duration-200 hover:bg-[#fff5f5]/20 hover:scale-105"
          style={{
            background: 'rgba(255, 245, 245, 0.1)',
            color: '#fff5f5',
            backdropFilter: 'blur(5px)',
          }}
          title={isLeftSidebarOpen ? "Close Left Sidebar" : "Open Left Sidebar"}
        >
          {isLeftSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </div>

      <div className="flex flex-grow min-h-0">
        {/* Left Sidebar */}
        <aside 
          data-tutorial="node-library"
          className={`flex flex-col shrink-0 overflow-y-auto transition-all duration-300 ease-in-out 
                     ${isLeftSidebarOpen ? 'w-72 p-4' : 'w-0 p-0 overflow-hidden'}`}
          style={{ 
            background: 'rgba(0, 0, 0, 0.7)',
            borderRight: '1px solid rgba(255, 245, 245, 0.2)',
            backdropFilter: 'blur(10px)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 245, 245, 0.3) transparent'
          }}
        >
          {isLeftSidebarOpen && (
            <>
              {/* Hidden search functionality - keeping for future use */}
              <div style={{ display: 'none' }}>
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search nodes or patterns..."
                />
              </div>

              {/* Node Category Tabs */}
              <div className="flex gap-1 mb-4">
                {['LLM', 'Tools', 'Data', 'Saved'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab
                        ? 'bg-[#fff5f5]/20 text-[#fff5f5] border border-[#fff5f5]/30'
                        : 'text-[#fff5f5]/60 hover:text-[#fff5f5]/80 hover:bg-[#fff5f5]/10'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-4 flex-grow overflow-y-auto" style={{
                  paddingBottom: '1rem',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255, 245, 245, 0.3) transparent',
                  maxHeight: 'calc(100vh - 120px)'
              }}>
                {filteredSidebarItems.map(item => (
                  <div
                    key={item.key}
                    data-tutorial={
                      item.dragType === 'node' && 
                      ((item.dragData as any).nodeType === 'customInput' ? 'input-node' : 
                       (item.dragData as any).nodeType === 'llm' ? 'llm-node' : 
                       undefined)
                    }
                    onDragStart={event => {
                      if (item.dragType === 'node') {
                        const nodeData = item.dragData as { nodeType: string; nodeLabel: string; initialData: any };
                        onDragStart(event, nodeData.nodeType, nodeData.nodeLabel, nodeData.initialData);
                      } else if (item.dragType === 'pattern') {
                        const patternData = item.dragData as { pattern: string };
                        event.dataTransfer.setData('application/pattern', patternData.pattern);
                        event.dataTransfer.effectAllowed = 'move';
                      } else if (item.dragType === 'template') {
                        const templateData = item.dragData as { template: WorkflowTemplate };
                        event.dataTransfer.setData('application/template', JSON.stringify(templateData.template));
                        event.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    draggable
                    className="group relative p-3 rounded-xl cursor-grab active:scale-[0.97] transition-all duration-200"
                    style={{
                      background: 'rgba(255, 245, 245, 0.1)',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(94, 234, 212, 0.4)',
                      boxShadow: '0 0 8px rgba(94, 234, 212, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                        background: 'rgba(255, 245, 245, 0.15)',
                        backdropFilter: 'blur(5px)',
                      }}>
                        {item.icon}
                      </div>
                      <div className="flex flex-col flex-grow">
                        <span className="text-sm font-medium text-[#fff5f5]">{item.label}</span>
                        <div className="text-xs text-[#fff5f5]/70">{item.description}</div>
                        {item.dragType === 'template' && (
                          <div className="text-xs text-[#fff5f5]/50 mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar size={10} />
                              {new Date((item.dragData as any).template.created).toLocaleDateString()}
                            </div>
                            {(item as any).estimatedTime && (
                              <div className="flex items-center gap-2">
                                <span>⏱️</span>
                                {(item as any).estimatedTime}
                              </div>
                            )}
                            {(item as any).tags && (item as any).tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(item as any).tags.slice(0, 3).map((tag: string, idx: number) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-[#fff5f5]/10 rounded text-[10px]">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {item.dragType === 'template' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const template = (item.dragData as any).template;
                            handleDeleteTemplate(template.id, template.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20"
                          title="Delete template"
                        >
                          <X size={14} className="text-red-400 hover:text-red-300" />
                        </button>
                      )}
                    </div>
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: 'rgba(255, 245, 245, 0.05)',
                        border: '1px solid rgba(94, 234, 212, 0.6)',
                        backdropFilter: 'blur(5px)',
                        boxShadow: '0 0 12px rgba(94, 234, 212, 0.3)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* React Flow Canvas */}
        <main 
          data-tutorial="canvas"
          className="flex-grow h-full relative" 
          onDrop={onDrop} 
          onDragOver={onDragOver}
        >
          <ReactFlowGridBackground
            {...backgroundConfig}
            className="absolute inset-0 z-0"
            key={`bg-${backgroundConfig.gridColor}-${backgroundConfig.speed}-${backgroundConfig.flowDirection}-${backgroundConfig.numSquares}-${backgroundConfig.maxOpacity}`}
          />
          <ReactFlow
            nodes={highlightedNodes}
            edges={edges.map(edge => ({
              ...edge,
              type: isAgentRunning ? 'flowing' : 'default',
              style: edge.id === selectedEdgeId
                ? {
                    ...(edge.style || {}),
                    stroke: '#fff5f5',
                    strokeWidth: 3,
                    filter: 'drop-shadow(0 0 8px rgba(255, 245, 245, 0.5))'
                  }
                : edge.style,
              markerEnd: edge.id === selectedEdgeId
                ? {
                    type: MarkerType.ArrowClosed,
                    color: '#fff5f5',
                    width: 15,
                    height: 15,
                  }
                : edge.markerEnd
            }))}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
            panOnScroll={true}
            selectionOnDrag={false}
            panOnDrag={true}
            selectionMode={SelectionMode.Partial}
            snapToGrid={true}
            snapGrid={[20, 20]}
            style={{ background: 'transparent' }}
            className="relative z-10"
            defaultEdgeOptions={{
              style: { stroke: 'rgba(255, 245, 245, 0.6)', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255, 245, 245, 0.6)', width: 15, height: 15 },
              type: 'default',
            }}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onSelectionChange={onSelectionChange}
          >

            <style jsx global>{`
              @keyframes glowingNode {
                0% {
                  box-shadow: 0 0 15px #2E67F8, 0 0 25px rgba(46, 103, 248, 0.3);
                  border-color: #2E67F8;
                }
                33% {
                  box-shadow: 0 0 15px #30BF78, 0 0 25px rgba(48, 191, 120, 0.3);
                  border-color: #30BF78;
                }
                66% {
                  box-shadow: 0 0 15px #FF3B3B, 0 0 25px rgba(255, 59, 59, 0.3);
                  border-color: #FF3B3B;
                }
                100% {
                  box-shadow: 0 0 15px #2E67F8, 0 0 25px rgba(46, 103, 248, 0.3);
                  border-color: #2E67F8;
                }
              }
            `}</style>
          </ReactFlow>
          {toolsWindowOpen && (
            <ToolsWindow
              onClose={() => setToolsWindowOpen(false)}
              onSelectTool={handleAddActionsToAgent}
              onConnect={() => {
                // Potentially refresh or refetch tool connections here
              }}
            />
          )}

          <ConnectionsPanel
            isOpen={connectionsPanelOpen}
            onClose={() => setConnectionsPanelOpen(false)}
            onConnect={() => {
              // Refresh connections
            }}
            onSelectTool={handleAddActionsToAgent}
          />

        </main>
      </div>

      {/* Background Settings Panel and Zoom Controls */}
      <div className="absolute top-16 right-4 z-20">
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 p-1">
            <button
              onClick={() => rfInstance?.zoomIn()}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
              title="Zoom In"
            >
              <Plus className="w-4 h-4 text-white/80 hover:text-white" />
            </button>
            <button
              onClick={() => rfInstance?.zoomOut()}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4 text-white/80 hover:text-white" />
            </button>
            <button
              onClick={() => rfInstance?.fitView()}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
              title="Fit View"
            >
              <Maximize2 className="w-4 h-4 text-white/80 hover:text-white" />
            </button>
            <button
              onClick={() => {
                const newLockState = !nodesLocked;
                setNodesLocked(newLockState);
                setNodes(nodes => nodes.map(node => ({
                  ...node,
                  draggable: !newLockState
                })));
              }}
              className={`w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors ${
                nodesLocked ? 'bg-red-500/20' : ''
              }`}
              title={nodesLocked ? "Unlock All Nodes" : "Lock All Nodes"}
            >
              {nodesLocked ? (
                <Lock className="w-4 h-4 text-red-400" />
              ) : (
                <Unlock className="w-4 h-4 text-white/80 hover:text-white" />
              )}
            </button>
          </div>

          {/* MCP Tools Button */}
          <button
            onClick={() => setConnectionsPanelOpen(!connectionsPanelOpen)}
            className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 hover:scale-105 ${
              connectionsPanelOpen ? 'hover:bg-blue-500/20' : 'hover:bg-[#fff5f5]/20'
            }`}
            style={{
              background: connectionsPanelOpen ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 245, 245, 0.1)',
              color: connectionsPanelOpen ? '#60a5fa' : '#fff5f5',
              backdropFilter: 'blur(5px)',
            }}
            title="MCP Tools - Connect to external services"
          >
            <Link size={16} />
            MCP Tools
          </button>

          {/* Settings Panel */}
          <div className={`transition-all duration-300 ${isBackgroundSettingsOpen ? 'w-80' : 'w-auto'}`}>
            {/* Settings Toggle Button */}
            <button
              onClick={() => setIsBackgroundSettingsOpen(!isBackgroundSettingsOpen)}
              className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors bg-black/80 backdrop-blur-sm border border-white/20"
              title="Background Settings"
            >
              <Settings className="w-6 h-6 text-white/80 hover:text-white" />
            </button>

            {/* Settings Content */}
          {isBackgroundSettingsOpen && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border mt-2">
              <div className="p-4 max-h-[80vh] overflow-y-auto">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Background Style
                </h3>

                {/* Matrix Rain Preset */}
                <div className="mb-6">
                  <button
                    onClick={() => applyPreset(backgroundPresets[0])}
                    className="w-full text-left p-3 rounded-lg border border-green-500 bg-green-50 transition-all hover:shadow-md"
                  >
                    <div className="font-medium text-sm text-gray-800">
                      Matrix Rain
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Vertical flowing grid like digital rain
                    </div>
                  </button>
                </div>

                {/* Color Selection */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Grid Color
                  </h4>

                  {/* Color Presets */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {colorPresets.map((colorPreset) => (
                      <button
                        key={colorPreset.name}
                        onClick={() => applyColorPreset(colorPreset.color)}
                        className={`text-left p-2 rounded-lg border transition-all hover:shadow-md ${
                          selectedColor === colorPreset.color
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: colorPreset.color.replace('0.4', '1') }}
                          />
                          <span className="text-xs font-medium text-gray-800">
                            {colorPreset.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Color Input */}
                  <div className="border-t pt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Custom Color (RGBA)
                    </label>
                    <input
                      type="text"
                      value={selectedColor}
                      onChange={(e) => applyColorPreset(e.target.value)}
                      placeholder="rgba(0, 255, 65, 0.4)"
                      className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: rgba(red, green, blue, opacity)
                    </p>
                  </div>
                </div>

                {/* Custom Controls */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Custom Settings
                  </h4>

                  <div className="space-y-3">
                  {/* Speed Control */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Speed: {backgroundConfig.speed}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={backgroundConfig.speed}
                      onChange={(e) => updateBackgroundConfig('speed', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Opacity Control */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Opacity: {backgroundConfig.maxOpacity}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={backgroundConfig.maxOpacity}
                      onChange={(e) => updateBackgroundConfig('maxOpacity', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Grid Size */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Grid Size: {backgroundConfig.width}px
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      step="5"
                      value={backgroundConfig.width}
                      onChange={(e) => {
                        const size = parseInt(e.target.value);
                        updateBackgroundConfig('width', size);
                        updateBackgroundConfig('height', size);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Number of Squares */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Squares: {backgroundConfig.numSquares}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={backgroundConfig.numSquares}
                      onChange={(e) => updateBackgroundConfig('numSquares', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Flow Direction */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Flow Direction
                    </label>
                    <select
                      value={backgroundConfig.flowDirection}
                      onChange={(e) => updateBackgroundConfig('flowDirection', e.target.value)}
                      className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#1f2937',
                      }}
                    >
                      <option value="right">Right →</option>
                      <option value="left">Left ←</option>
                      <option value="up">Up ↑</option>
                      <option value="down">Down ↓</option>
                      <option value="diagonal">Diagonal ↗</option>
                    </select>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Onboarding Tutorial */}
      {showTutorial && <OnboardingTutorial onComplete={() => setShowTutorial(false)} />}
    </div>
  );
};

const initialEdges: Edge[] = [];