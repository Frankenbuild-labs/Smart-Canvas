"use client";

import React, { useState, useEffect } from 'react';
import { Search, X, RefreshCw, Check, Link, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Tool {
  slug: string;
  name: string;
  logo?: string;
  meta?: { logo?: string; description?: string };
  description?: string;
  authConfigMode?: string[];
  composioManagedAuthConfigs?: string[];
  noAuth?: boolean;
  category?: string;
}

interface Action {
  name: string;
  description?: string;
}

interface ConnectionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  onSelectTool: (toolActions: string) => void;
}

// Tool categories for better organization
const TOOL_CATEGORIES = {
  'Communication': ['gmail', 'slack', 'discord', 'telegram', 'whatsapp'],
  'Development': ['github', 'gitlab', 'bitbucket', 'jira', 'linear'],
  'Productivity': ['notion', 'airtable', 'trello', 'asana', 'monday'],
  'Cloud Storage': ['googledrive', 'dropbox', 'onedrive', 'box'],
  'Social Media': ['twitter', 'linkedin', 'facebook', 'instagram'],
  'Analytics': ['googleanalytics', 'mixpanel', 'amplitude'],
  'Other': []
};

const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({
  isOpen,
  onClose,
  onConnect,
  onSelectTool
}) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [search, setSearch] = useState('');
  const [loadingTools, setLoadingTools] = useState(true);
  const [loadingActions, setLoadingActions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: 'idle' | 'connecting' | 'waiting' | 'connected' | 'failed' }>({});
  const [showToolActions, setShowToolActions] = useState(false);

  // Connection state from ToolsWindow
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalType, setAuthModalType] = useState<'api_key' | 'client_credentials' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectingTool, setConnectingTool] = useState(false);
  const [lastConnectionId, setLastConnectionId] = useState<string | null>(null);
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);

  // Listen for OAuth callback messages (from ToolsWindow)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'composio_auth_success') {
        console.log('[OAuth Callback] Success:', event.data);
        if (selectedTool) {
          setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'connected' }));
          setIsAlreadyConnected(true);
          setLastConnectionId(event.data.connectionId);
        }
      } else if (event.data.type === 'composio_auth_error') {
        console.log('[OAuth Callback] Error:', event.data);
        if (selectedTool) {
          setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'failed' }));
          setAuthError(event.data.error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedTool]);

  // Fetch tools on component mount
  useEffect(() => {
    setLoadingTools(true);
    fetch('/api/composio-tools')
      .then(res => res.json())
      .then(data => {
        const toolsWithCategories = (data.tools || []).map((tool: Tool) => ({
          ...tool,
          category: getCategoryForTool(tool.slug)
        }));
        setTools(toolsWithCategories);
      })
      .catch(() => setTools([]))
      .finally(() => setLoadingTools(false));
  }, []);

  // Get category for a tool
  const getCategoryForTool = (slug: string): string => {
    for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
      if (tools.includes(slug.toLowerCase())) {
        return category;
      }
    }
    return 'Other';
  };

  // Filter tools based on search and category
  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) ||
                         tool.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group tools by category
  const toolsByCategory = filteredTools.reduce((acc, tool) => {
    const category = tool.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tool);
    return acc;
  }, {} as { [key: string]: Tool[] });

  // Handle tool click - check connection status (from ToolsWindow)
  const handleToolClick = (tool: Tool) => {
    setSelectedTool(tool);
    setShowToolActions(true);
    setIsAlreadyConnected(false);
    setConnectionStatus(prev => ({ ...prev, [tool.slug]: 'idle' }));

    fetch(`/api/connection/wait?toolkitSlug=${tool.slug}&composioApiKey=ykv9efkzffsw4cr79xsi2g`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'connected' || data.status === 'ACTIVE') {
          setIsAlreadyConnected(true);
          setConnectionStatus(prev => ({ ...prev, [tool.slug]: 'connected' }));
          // If connected, fetch actions
          fetchActions(tool);
        } else {
          setIsAlreadyConnected(false);
          setConnectionStatus(prev => ({ ...prev, [tool.slug]: 'idle' }));
        }
      })
      .catch(() => {
        setIsAlreadyConnected(false);
        setConnectionStatus(prev => ({ ...prev, [tool.slug]: 'idle' }));
      });
  };

  // Fetch actions for a tool
  const fetchActions = (tool: Tool) => {
    setLoadingActions(true);
    fetch(`/api/composio-tools/actions?toolkitSlug=${tool.slug}&composioApiKey=ykv9efkzffsw4cr79xsi2g`)
      .then(res => res.json())
      .then(data => {
        setActions(data.actions || []);
      })
      .catch(() => setActions([]))
      .finally(() => setLoadingActions(false));
  };

  // Connection functions from ToolsWindow
  const handleConnectClick = async () => {
    if (!selectedTool) return;
    setConnectingTool(true);
    setAuthError(null);
    setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'connecting' }));

    const hasAuthModes = selectedTool.authConfigMode && selectedTool.authConfigMode.length > 0;
    const isOAuth2Available = hasAuthModes && selectedTool.authConfigMode!.includes('OAUTH2');
    const isComposioManagedOauth = isOAuth2Available && selectedTool.composioManagedAuthConfigs?.includes('OAUTH2');
    const isApiKeyAuth = hasAuthModes && selectedTool.authConfigMode!.includes('API_KEY');
    const isBearerAuth = hasAuthModes && selectedTool.authConfigMode!.includes('BEARER_TOKEN');

    if (isOAuth2Available) {
      if (!isComposioManagedOauth) {
        setAuthModalType('client_credentials');
        setShowAuthModal(true);
        setConnectingTool(false);
        setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'idle' }));
        return;
      }
    } else if (isApiKeyAuth || isBearerAuth) {
      setAuthModalType('api_key');
      setShowAuthModal(true);
      setConnectingTool(false);
      setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'idle' }));
      return;
    }

    try {
      const response = await fetch('/api/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolkitSlug: selectedTool.slug, composioApiKey: 'ykv9efkzffsw4cr79xsi2g' }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        let errorMessage = `Failed to connect ${selectedTool.name}`;
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message && typeof data.error.message === 'string') {
            errorMessage = data.error.message;
          } else {
            errorMessage = `Connection failed: An unexpected error structure was received.`;
          }
        }
        throw new Error(errorMessage);
      }

      if (data.status === 'oauth2_redirect') {
        if (data.redirectUrl) {
          window.open(data.redirectUrl, '_blank');
          setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'waiting' }));
          setLastConnectionId(data.connectionId || null);
        } else if (data.connectionId) {
          setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'connected' }));
          setLastConnectionId(data.connectionId);
          onConnect(selectedTool.name, actions);
        } else {
          throw new Error('OAuth2 response missing redirect URL and connection ID.');
        }
      } else if (data.status === 'connected' && data.connectionId) {
        setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'waiting' }));
        setLastConnectionId(data.connectionId);
      } else {
        throw new Error('Unexpected response from server: Invalid status or missing connection details.');
      }
    } catch (error: any) {
      console.error('[Connect Error]', error);
      setAuthError(error.message || 'An unknown error occurred');
      setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'failed' }));
    } finally {
      setConnectingTool(false);
    }
  };

  const handleModalSubmit = async () => {
    if (!selectedTool || !authModalType) return;
    setConnectingTool(true);
    setAuthError(null);
    let body: any = { toolkitSlug: selectedTool.slug, composioApiKey: 'ykv9efkzffsw4cr79xsi2g' };
    if (authModalType === 'api_key') {
      body.apiKey = apiKey;
    } else if (authModalType === 'client_credentials') {
      body.clientId = clientId;
      body.clientSecret = clientSecret;
    }
    try {
      const response = await fetch('/api/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        let errorMessage = `Failed to connect ${selectedTool.name}`;
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message && typeof data.error.message === 'string') {
            errorMessage = data.error.message;
          } else {
            console.error("Received complex error object from server (modal connect):", data.error);
            errorMessage = `Connection failed: An unexpected error structure was received.`;
          }
        }
        throw new Error(errorMessage);
      }

      if (data.status === 'oauth2_redirect') {
        if (data.redirectUrl) {
          window.open(data.redirectUrl, '_blank');
        } else if (data.connectionId) {
          setShowAuthModal(false);
          setApiKey('');
          setClientId('');
          setClientSecret('');
          onConnect(selectedTool.name, actions);
        } else {
          throw new Error('OAuth2 response missing redirect URL and connection ID.');
        }
      } else if (data.status === 'connected' && data.connectionId) {
        setShowAuthModal(false);
        setApiKey('');
        setClientId('');
        setClientSecret('');
        onConnect(selectedTool.name, actions);
      } else {
        throw new Error('Unexpected response from server: Invalid status or missing connection details.');
      }
    } catch (error: any) {
      console.error('[Modal Connect Error]', error);
      setAuthError(error.message || 'An unknown error occurred');
    } finally {
      setConnectingTool(false);
    }
  };

  const stopClipboardPropagation = (event: React.ClipboardEvent) => {
    event.stopPropagation();
  };

  // Get all categories including 'All'
  const allCategories = ['All', ...Object.keys(TOOL_CATEGORIES)];

  if (!isOpen) return null;

  return (
    <div className={`fixed top-0 right-0 h-full w-96 bg-black/90 backdrop-blur-xl border-l border-white/20 z-[1000] transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-white/80" />
            <h2 className="text-lg font-semibold text-white">Connections</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/20">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="bg-white/10 border-white/20 text-white placeholder-white/50"
          />
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-white/20">
          <div className="flex flex-wrap gap-2">
            {allCategories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingTools ? (
            <div className="text-white/70 text-center mt-8">Loading tools...</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-white/70 mb-3">{category}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {categoryTools.map(tool => {
                      const status = connectionStatus[tool.slug] || 'idle';
                      return (
                        <div
                          key={tool.slug}
                          onClick={() => handleToolClick(tool)}
                          className="relative p-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200 group"
                        >
                          {/* Connection Status Indicator */}
                          <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                            status === 'connected' ? 'bg-green-400' :
                            status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                            status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                          }`} />
                          
                          {/* Tool Logo */}
                          <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-white/10 flex items-center justify-center">
                            {tool.logo || tool.meta?.logo ? (
                              <img 
                                src={tool.logo || tool.meta?.logo} 
                                alt={tool.name} 
                                className="w-6 h-6 rounded"
                              />
                            ) : (
                              <div className="text-white/80 text-sm font-bold">
                                {tool.name[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          
                          {/* Tool Name */}
                          <div className="text-xs text-white/80 text-center truncate">
                            {tool.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tool Actions View - Clean single container design */}
      {showToolActions && selectedTool && (
        <div className="fixed inset-0 z-[1001] bg-black/95 backdrop-blur-xl">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center gap-4">
                {selectedTool.logo || selectedTool.meta?.logo ? (
                  <img
                    src={selectedTool.logo || selectedTool.meta?.logo}
                    alt={selectedTool.name}
                    className="w-12 h-12 rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white text-xl font-bold">
                    {selectedTool.name[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-semibold text-white">{selectedTool.name}</h2>
                  <div className={`text-sm flex items-center gap-2 ${
                    connectionStatus[selectedTool.slug] === 'connected' ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus[selectedTool.slug] === 'connected' ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                    {connectionStatus[selectedTool.slug] === 'connected' ? 'Connected' : 'Not Connected'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isAlreadyConnected ? (
                  <div className="px-6 py-3 rounded-lg border font-medium bg-green-600 border-green-700 text-white shadow-md backdrop-blur-md whitespace-nowrap flex items-center justify-center">
                    Connected
                  </div>
                ) : selectedTool?.noAuth ? (
                  <button
                    className="px-6 py-3 rounded-lg border font-medium bg-gray-500 border-gray-600 text-white shadow-md backdrop-blur-md whitespace-nowrap cursor-not-allowed opacity-60"
                    disabled
                  >
                    No Auth Needed
                  </button>
                ) : (
                  <button
                    onClick={handleConnectClick}
                    className={`px-6 py-3 rounded-lg border font-medium transition-all duration-200 shadow-md backdrop-blur-md whitespace-nowrap
                      ${connectionStatus[selectedTool?.slug] === 'failed' ? 'bg-red-600 border-red-700 text-white' : ''}
                      ${connectionStatus[selectedTool?.slug] === 'waiting' ? 'bg-yellow-600 border-yellow-700 text-white' : ''}
                      ${connectionStatus[selectedTool?.slug] === 'idle' || connectionStatus[selectedTool?.slug] === 'connecting' ? 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white' : ''}`}
                    disabled={loadingActions || connectingTool}
                  >
                    {connectionStatus[selectedTool?.slug] === 'failed'
                      ? 'Failed'
                      : connectionStatus[selectedTool?.slug] === 'waiting'
                        ? 'Waiting...'
                        : connectingTool
                          ? 'Connecting...'
                          : (loadingActions ? 'Loading Actions...' : 'Connect')}
                  </button>
                )}
                <button
                  onClick={() => setShowToolActions(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6 text-white/80" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {connectionStatus[selectedTool.slug] === 'connected' ? (
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-2">Available Actions</h3>
                    <p className="text-white/60">Select actions to add to your workflow</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingActions ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="text-white/70">Loading actions...</div>
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-2xl">
                        {actions.map(action => (
                          <div
                            key={action.name}
                            className="p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200 hover:border-blue-400/50"
                            onClick={() => {
                              // Add action to selected actions
                              onSelectTool(action.name);
                              setShowToolActions(false);
                            }}
                          >
                            <div className="text-white font-medium text-lg mb-2">{action.name}</div>
                            {action.description && (
                              <div className="text-white/70 text-sm leading-relaxed">{action.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-white/60 mb-4">Connect to {selectedTool.name} to view available actions</div>
                    <Button
                      onClick={handleConnectClick}
                      disabled={connectingTool}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {connectingTool ? 'Connecting...' : 'Connect Now'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal (from ToolsWindow) */}
      {showAuthModal && selectedTool && (
        <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
          <DialogContent className="bg-[rgba(0,0,0,0.95)] border-[rgba(255,245,245,0.1)] text-[#fff5f5]">
            <DialogHeader>
              <DialogTitle className="text-[#fff5f5]">Connect to {selectedTool.name}</DialogTitle>
              <DialogDescription className="text-[#fff5f5]/70">
                {authModalType === 'api_key' ? `Please enter the ${selectedTool?.authConfigMode?.includes('BEARER_TOKEN') ? 'Bearer Token' : 'API Key'} to connect.` : 'Please enter the Client ID and Client Secret to connect.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {authModalType === 'api_key' && (
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedTool?.authConfigMode?.includes('BEARER_TOKEN') ? 'Bearer Token' : 'API Key'}
                  className="bg-[rgba(255,245,245,0.05)] border-[rgba(255,245,245,0.1)] placeholder-[#fff5f5]/40"
                  onPaste={stopClipboardPropagation}
                  onCopy={stopClipboardPropagation}
                  onCut={stopClipboardPropagation}
                />
              )}
              {authModalType === 'client_credentials' && (
                <>
                  <Input
                    id="clientId"
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Client ID"
                    className="bg-[rgba(255,245,245,0.05)] border-[rgba(255,245,245,0.1)] placeholder-[#fff5f5]/40"
                    onPaste={stopClipboardPropagation}
                    onCopy={stopClipboardPropagation}
                    onCut={stopClipboardPropagation}
                  />
                  <Input
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Client Secret"
                    className="bg-[rgba(255,245,245,0.05)] border-[rgba(255,245,245,0.1)] placeholder-[#fff5f5]/40"
                    onPaste={stopClipboardPropagation}
                    onCopy={stopClipboardPropagation}
                    onCut={stopClipboardPropagation}
                  />
                </>
              )}
              {authError && (
                <p className="text-sm text-red-400">Error: {authError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleModalSubmit}
                disabled={connectingTool}
                className="bg-[rgba(255,245,245,0.1)] hover:bg-[rgba(255,245,245,0.2)] text-[#fff5f5]"
              >
                {connectingTool ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ConnectionsPanel;
