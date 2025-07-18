"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { MessageSquare, Send, Loader2, Copy, Trash2, Bot } from 'lucide-react';

export interface ChatWithAnythingNodeData {
  label: string;
  systemPrompt: string;
  apiKey: string;
  modelProvider: 'openai' | 'anthropic' | 'google' | 'orchestrator';
  modelName: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  currentInput: string;
  isLoading?: boolean;
  inputData?: any; // Data received from connected nodes
  workflowData?: any; // Data received from workflow execution
  onNodeDataChange?: (id: string, data: Partial<ChatWithAnythingNodeData>) => void;
  _forceRerender?: number;
}

interface ChatWithAnythingNodeProps extends NodeProps<ChatWithAnythingNodeData> {
  getNodes?: () => any[];
  getEdges?: () => any[];
  onExecuteWorkflow?: (chatInput: string) => Promise<void>;
}

const ChatWithAnythingNode: React.FC<ChatWithAnythingNodeProps> = ({ id, data, onExecuteWorkflow }) => {
  const { getNodes, getEdges } = useReactFlow();

  // React Flow v11 compatible approach - but done correctly this time
  const connectedNodesData = useMemo(() => {
    const edges = getEdges();
    const nodes = getNodes();

    console.log('🔍 [CHAT DEBUG] ===== CONNECTION DETECTION START =====');
    console.log('🔍 [CHAT DEBUG] React Flow v11 - All edges:', edges.length);
    console.log('🔍 [CHAT DEBUG] React Flow v11 - All edges details:', edges);
    console.log('🔍 [CHAT DEBUG] React Flow v11 - All nodes:', nodes.length);
    console.log('🔍 [CHAT DEBUG] React Flow v11 - Current node ID:', id);

    // Find edges that connect TO this node (incoming connections)
    const incomingEdges = edges.filter(edge => edge.target === id);
    console.log('[Chat Node Debug] React Flow v11 - Incoming edges:', incomingEdges.length);

    if (incomingEdges.length === 0) {
      console.log('[Chat Node Debug] React Flow v11 - No incoming connections found');
      return [];
    }

    // Get the source nodes that are connected to this node
    const sourceNodeIds = incomingEdges.map(edge => edge.source);
    const sourceNodes = nodes.filter(node => sourceNodeIds.includes(node.id));

    console.log('[Chat Node Debug] React Flow v11 - Connected source node IDs:', sourceNodeIds);
    console.log('[Chat Node Debug] React Flow v11 - Connected nodes found:', sourceNodes.length);

    // Log detailed information about each connected node
    sourceNodes.forEach((node, index) => {
      console.log(`[Chat Node Debug] Connected Node ${index + 1}:`, {
        id: node.id,
        type: node.type,
        hasData: !!node.data,
        hasProcessedContent: !!node.data?.processedContent,
        hasVideoData: !!node.data?.videoData,
        hasExtractedText: !!node.data?.extractedText,
        hasGeneratedImage: !!node.data?.generatedImage,
        dataKeys: node.data ? Object.keys(node.data) : []
      });
    });

    return sourceNodes;
  }, [getEdges, getNodes, id]);
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt || 'You are a helpful AI assistant. Analyze and respond to any input you receive.');
  const [apiKey, setApiKey] = useState(data.apiKey || '');
  const [modelProvider, setModelProvider] = useState(data.modelProvider || 'openai');
  const [modelName, setModelName] = useState(data.modelName || 'gpt-4o');
  const [messages, setMessages] = useState(data.messages || []);
  const [currentInput, setCurrentInput] = useState(data.currentInput || '');
  const [isLoading, setIsLoading] = useState(false);
  const [inputData, setInputData] = useState(data.inputData || null);



  // Effect to update input data when workflow execution provides it
  useEffect(() => {
    if (data.workflowData && data.workflowData !== inputData) {
      setInputData(data.workflowData);
      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, { inputData: data.workflowData });
      }
    }
  }, [data.workflowData, inputData, id, data.onNodeDataChange]);

  const sendMessageViaWorkflow = async () => {
    if (!onExecuteWorkflow) return;

    const userMessage = {
      role: 'user' as const,
      content: currentInput,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentInput('');
    setIsLoading(true);

    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, {
        messages: newMessages,
        currentInput: '',
        isLoading: true
      });
    }

    try {
      // Execute workflow with chat input
      await onExecuteWorkflow(currentInput);

      // The workflow result should be handled by the parent component
      // and passed back via workflowData
    } catch (error) {
      console.error('Workflow execution error:', error);

      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: Date.now()
      };

      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);

      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, {
          messages: updatedMessages,
          isLoading: false
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSystemPrompt(data.systemPrompt || 'You are a helpful AI assistant. Analyze and respond to any input you receive.');
    setApiKey(data.apiKey || '');
    setModelProvider(data.modelProvider || 'openai');
    setModelName(data.modelName || 'gpt-4');
    setMessages(data.messages || []);
    setCurrentInput(data.currentInput || '');
  }, [data._forceRerender]);

  const modelOptions = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    google: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.0-pro'],
    orchestrator: ['metatron-orchestrator']
  };

  const handleSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setSystemPrompt(newPrompt);
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { systemPrompt: newPrompt });
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { apiKey: newKey });
    }
  };

  const handleModelProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as 'openai' | 'anthropic' | 'google' | 'orchestrator';
    const newModelName = modelOptions[newProvider][0];
    setModelProvider(newProvider);
    setModelName(newModelName);
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { modelProvider: newProvider, modelName: newModelName });
    }
  };

  const handleModelNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelName = e.target.value;
    setModelName(newModelName);
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { modelName: newModelName });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const newInput = e.target.value;
    setCurrentInput(newInput);
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { currentInput: newInput });
    }
  };

  const sendMessage = async () => {
    if (!currentInput.trim() || isLoading) return;

    // Check if we have connected nodes with data (OFFICIAL REACT FLOW WAY)
    const hasConnectedData = connectedNodesData && connectedNodesData.length > 0;

    // For workflow mode: use if there are connections AND workflow execution is available
    const shouldUseWorkflow = hasConnectedData && onExecuteWorkflow;

    if (shouldUseWorkflow) {
      // Workflow execution mode - let the workflow handle the processing
      await sendMessageViaWorkflow();
      return;
    }

    // Free canvas mode - direct API call with connected data
    if (modelProvider !== 'orchestrator' && !apiKey) {
      console.error('API key required for', modelProvider);
      return;
    }

    // Prepare message content with connected node data (CONTENT SYNTHESIS)
    let messageContent = currentInput;

    if (hasConnectedData) {
      // Extract data from ANY connected node type
      const contentParts = [];

      connectedNodesData.forEach(node => {
        if (!node || !node.data) return;

        const data = node.data;

        let nodeContent = '';

        // PRIORITY 1: Check for processedContent (our standardized format)
        if (data.processedContent) {
          const pc = data.processedContent;
          nodeContent = `**${pc.type?.toUpperCase() || node.type?.toUpperCase()} Node: ${pc.title || 'Untitled'}**\n${pc.content || 'No content available'}`;

          // Add metadata if available
          if (pc.metadata && typeof pc.metadata === 'object') {
            nodeContent += '\n\n**Metadata:**\n';
            Object.entries(pc.metadata).forEach(([key, value]) => {
              if (value && typeof value === 'string') {
                nodeContent += `${key}: ${value}\n`;
              }
            });
          }
        }
        // PRIORITY 2: Check for specific known data structures
        else if (data.videoData) {
          // YouTube node
          const vd = data.videoData;
          nodeContent = `**YOUTUBE Video: ${vd.title || 'Untitled'}**\n`;
          if (vd.description) nodeContent += `Description: ${vd.description}\n`;
          if (vd.transcript) nodeContent += `Transcript: ${vd.transcript}\n`;
          if (vd.duration) nodeContent += `Duration: ${vd.duration}\n`;
          if (vd.channel) nodeContent += `Channel: ${vd.channel}\n`;
        }
        else if (data.extractedText) {
          // Document node
          nodeContent = `**DOCUMENT: ${data.uploadedFile?.name || 'Document'}**\n${data.extractedText}`;
        }
        else if (data.generatedImage) {
          // Image generation node
          nodeContent = `**GENERATED IMAGE**\nPrompt: ${data.prompt || 'No prompt'}\nProvider: ${data.provider || 'Unknown'}\nImage URL: ${data.generatedImage.url || 'No URL'}`;
        }
        else if (data.analysisResult) {
          // Media upload node
          nodeContent = `**MEDIA ANALYSIS: ${data.uploadedFile?.name || 'Media File'}**\n`;
          if (data.analysisResult.description) nodeContent += `Description: ${data.analysisResult.description}\n`;
          if (data.analysisResult.objects) nodeContent += `Objects: ${data.analysisResult.objects.join(', ')}\n`;
          if (data.analysisResult.text) nodeContent += `Text: ${data.analysisResult.text}\n`;
        }
        // PRIORITY 3: Generic fallback extraction
        else {
          nodeContent = `**${node.type?.toUpperCase() || 'UNKNOWN'} Node:**\n`;
          Object.entries(data).forEach(([key, value]) => {
            // Skip internal/system properties
            if (key.startsWith('_') || key === 'onNodeDataChange' || key === 'isLoading') return;

            if (value && typeof value === 'string' && value.trim()) {
              nodeContent += `${key}: ${value}\n`;
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
              // Handle nested objects
              nodeContent += `${key}:\n`;
              Object.entries(value).forEach(([subKey, subValue]) => {
                if (subValue && typeof subValue === 'string' && subValue.trim()) {
                  nodeContent += `  ${subKey}: ${subValue}\n`;
                }
              });
            } else if (Array.isArray(value) && value.length > 0) {
              nodeContent += `${key}: ${value.join(', ')}\n`;
            }
          });
        }

        if (nodeContent.trim()) {
          contentParts.push(nodeContent.trim());
        }
      });

      const connectedContent = contentParts.join('\n\n---\n\n');
      if (connectedContent) {
        messageContent = `**CONNECTED SOURCES:**
${connectedContent}

**USER REQUEST:**
${currentInput}`;
      }
    }

    const userMessage = {
      role: 'user' as const,
      content: messageContent,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-with-anything', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt,
          apiKey,
          modelProvider,
          modelName
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get AI response: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const assistantMessage = {
          role: 'assistant' as const,
          content: result.response,
          timestamp: Date.now()
        };
        
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        
        if (data.onNodeDataChange) {
          data.onNodeDataChange(id, { 
            messages: updatedMessages,
            currentInput: '',
            isLoading: false
          });
        }
      } else {
        throw new Error(result.error || 'Failed to get AI response');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${err.message}`,
        timestamp: Date.now()
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      
      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, { messages: updatedMessages, isLoading: false });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { messages: [] });
    }
  };

  const copyLastResponse = () => {
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMessage) {
      navigator.clipboard.writeText(lastAssistantMessage.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation for all key events to prevent ReactFlow interference
    e.stopPropagation();

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Allow all other keys (including spacebar) to work normally
  };

  return (
    <div className="bg-white border-2 rounded-lg shadow-lg min-w-[350px] max-w-[400px] border-gray-300">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} />
            <span className="font-medium">{data.label}</span>
            {/* Connection Status Indicator */}
            {connectedNodesData && connectedNodesData.length > 0 && (
              <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{connectedNodesData.length} source{connectedNodesData.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={copyLastResponse}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Copy last response"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={clearChat}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Model Configuration */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={modelProvider}
                onChange={handleModelProviderChange}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="orchestrator">Orchestrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
              <select
                value={modelName}
                onChange={handleModelNameChange}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                }}
              >
                {modelOptions[modelProvider].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              API Key {modelProvider === 'orchestrator' && <span className="text-gray-500">(not required)</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder={modelProvider === 'orchestrator' ? 'Not required for Orchestrator' : 'Enter API key...'}
              disabled={modelProvider === 'orchestrator'}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              style={{
                backgroundColor: modelProvider === 'orchestrator' ? '#f9fafb' : '#ffffff',
                color: '#1f2937',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={handleSystemPromptChange}
              onPaste={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              placeholder="System instructions..."
              rows={2}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
              style={{
                backgroundColor: '#ffffff',
                color: '#1f2937',
              }}
            />
          </div>
        </div>

        {/* Chat Messages */}
        <div className="border border-gray-200 rounded-md h-48 overflow-y-auto p-2 space-y-2 bg-gray-50">
          {/* Connected Content Status */}
          {connectedNodesData && connectedNodesData.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
              <div className="font-medium text-blue-800 mb-1">Connected Sources:</div>
              {connectedNodesData.map((node, index) => {
                const data = node?.data;
                if (!data) return null;

                let displayText = '';

                // Check processedContent first
                if (data.processedContent) {
                  const pc = data.processedContent;
                  displayText = `${pc.type?.toUpperCase() || node.type?.toUpperCase()}: ${pc.title || 'Untitled'}`;
                }
                // Check specific data structures
                else if (data.videoData?.title) {
                  displayText = `YOUTUBE: ${data.videoData.title}`;
                }
                else if (data.uploadedFile?.name) {
                  displayText = `DOCUMENT: ${data.uploadedFile.name}`;
                }
                else if (data.generatedImage && data.prompt) {
                  displayText = `IMAGE: ${data.prompt.substring(0, 30)}...`;
                }
                else if (data.analysisResult && data.uploadedFile?.name) {
                  displayText = `MEDIA: ${data.uploadedFile.name}`;
                }
                else {
                  displayText = `${node.type?.toUpperCase() || 'UNKNOWN'}: ${data.label || 'Connected Node'}`;
                }

                return (
                  <div key={index} className="text-blue-700">
                    • {displayText}
                  </div>
                );
              })}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-xs py-8">
              <Bot size={24} className="mx-auto mb-2 opacity-50" />
              <p>
                {connectedNodesData && connectedNodesData.length > 0
                  ? "Connected sources ready! Ask me anything about them..."
                  : "Start a conversation..."
                }
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`p-2 rounded text-xs ${
                  message.role === 'user'
                    ? 'bg-purple-100 text-purple-800 ml-4'
                    : 'bg-white text-gray-800 mr-4 border'
                }`}
              >
                <div className="font-medium mb-1">
                  {message.role === 'user' ? 'You' : 'AI'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <textarea
            value={currentInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            style={{
              backgroundColor: '#ffffff',
              color: '#1f2937',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!currentInput.trim() || (modelProvider !== 'orchestrator' && !apiKey) || isLoading}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>

        {/* Status */}
        <div className="text-xs text-gray-500">
          {modelProvider === 'orchestrator' ? (
            <span className="text-green-600">✓ Ready to chat (using Orchestrator)</span>
          ) : apiKey ? (
            <span className="text-green-600">✓ Ready to chat</span>
          ) : (
            <span>Enter API key to start chatting</span>
          )}
          {(() => {
            const hasConnectedNodes = connectedNodesData && connectedNodesData.length > 0;
            const hasData = hasConnectedNodes || data.workflowData || inputData;
            console.log('[Chat Node Debug] Status indicator check:', {
              connectedNodesCount: connectedNodesData?.length || 0,
              workflowData: data.workflowData,
              inputData,
              hasData
            });
            return hasData && (
              <div className="text-blue-600 mt-1 flex items-center gap-1">
                <span>📊</span>
                <span>{data.workflowData || inputData ? 'Workflow data available' : `${connectedNodesData?.length || 0} connected node(s)`}</span>
              </div>
            );
          })()}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default ChatWithAnythingNode;
