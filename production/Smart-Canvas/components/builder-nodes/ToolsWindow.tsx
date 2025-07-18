"use client";

import React, { useState, useEffect } from 'react';
import { Search, X, RefreshCw, Check } from 'lucide-react';
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
}

interface Action {
  name: string;
  description?: string;
}

interface ToolsWindowProps {
  onClose: () => void;
  onConnect: (toolName: string, actions: Action[]) => void;
  onSelectTool: (items: Action[]) => void;
}

const ToolsWindow: React.FC<ToolsWindowProps> = ({ onClose, onConnect, onSelectTool }) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [search, setSearch] = useState('');
  const [loadingTools, setLoadingTools] = useState(true);
  const [loadingActions, setLoadingActions] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalType, setAuthModalType] = useState<'api_key' | 'client_credentials' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectingTool, setConnectingTool] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{[slug: string]: 'idle' | 'connecting' | 'waiting' | 'connected' | 'failed'}>({});
  const [lastConnectionId, setLastConnectionId] = useState<string | null>(null);
  const [selectedActionNames, setSelectedActionNames] = useState<string[]>([]);
  const lastCheckedRef = React.useRef<{toolSlug: string, apiKey: string} | null>(null);
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);

  const stopClipboardPropagation = (event: React.ClipboardEvent) => {
    event.stopPropagation();
  };

  // Listen for OAuth callback messages
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

  useEffect(() => {
    // Only fetch tools once on mount
    let didCancel = false;
    const fetchTools = async () => {
      setLoadingTools(true);
      try {
        const response = await fetch('/api/composio-tools');
        const data = await response.json();
        if (!didCancel) setTools(data.tools || []);
      } catch (error) {
        if (!didCancel) setTools([]);
      } finally {
        if (!didCancel) setLoadingTools(false);
      }
    };
    fetchTools();
    return () => { didCancel = true; };
  }, []);

  useEffect(() => {
    if (!selectedTool) {
      setActions([]);
      return;
    }
    setLoadingActions(true);
    const composioApiKey = process.env.COMPOSIO_API_KEY || 'ykv9efkzffsw4cr79xsi2g';
    const fetchUrl = `/api/composio-tools/actions?toolkitSlug=${selectedTool.slug}&composioApiKey=${encodeURIComponent(composioApiKey)}`;
    fetch(fetchUrl)
      .then(res => res.json())
      .then(data => {
        setActions(data.actions || []);
      })
      .catch(() => {
        setActions([]);
      })
      .finally(() => setLoadingActions(false));
  }, [selectedTool]);

  const handleToolClick = (tool: Tool) => {
    setSelectedTool(tool);
    setIsAlreadyConnected(false);
    setConnectionStatus(prev => ({ ...prev, [tool.slug]: 'idle' }));
    fetch(`/api/connection/wait?toolkitSlug=${tool.slug}&composioApiKey=ykv9efkzffsw4cr79xsi2g`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'connected' || data.status === 'ACTIVE') {
          setIsAlreadyConnected(true);
          setConnectionStatus(prev => ({ ...prev, [tool.slug]: 'connected' }));
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

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(search.toLowerCase()) ||
    tool.meta?.description?.toLowerCase().includes(search.toLowerCase()) ||
    tool.description?.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleReloadStatus = async () => {
    if (!selectedTool || !lastConnectionId) return;
    setConnectingTool(true);
    setAuthError(null);
    try {
      const waitRes = await fetch(`/api/connection/wait?connectionId=${lastConnectionId}&composioApiKey=ykv9efkzffsw4cr79xsi2g`);
      const waitData = await waitRes.json();
      if (waitRes.ok && waitData.status === 'connected') {
        setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'connected' }));
        onConnect(selectedTool.name, actions);
      } else {
        setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'waiting' }));
        setAuthError('Still waiting for connection.');
      }
    } catch (err) {
      setAuthError('Failed to check connection status.');
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
          // OAuth2 completed without redirect, but we have a connection ID
          setShowAuthModal(false);
          setApiKey('');
          setClientId('');
          setClientSecret('');
          onConnect(selectedTool.name, actions);
        } else {
          // status is oauth2_redirect but no redirectUrl and no connectionId
          throw new Error('OAuth2 response missing redirect URL and connection ID.');
        }
      } else if (data.status === 'connected' && data.connectionId) {
        setShowAuthModal(false);
        setApiKey('');
        setClientId('');
        setClientSecret('');
        onConnect(selectedTool.name, actions); // Or refresh state to show tool as connected
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

  const toggleAction = (action: Action) => {
    setSelectedActionNames(prev =>
      prev.includes(action.name)
        ? prev.filter(a => a !== action.name)
        : [...prev, action.name]
    );
  };

  const handleAddActionsToAgent = () => {
    const selected = actions.filter(a => selectedActionNames.includes(a.name));
    if (selected.length > 0 && selectedTool) {
      const formattedActions = selected.map(a => ({ name: `${selectedTool.slug}_${a.name}` }));
      onSelectTool(formattedActions);
    }
  };

  // Manual reload for connection status
  const handleManualReload = async () => {
    if (!selectedTool) return;
    setConnectingTool(true);
    try {
      const res = await fetch(`/api/connection/wait?toolkitSlug=${selectedTool.slug}&composioApiKey=ykv9efkzffsw4cr79xsi2g`);
      const data = await res.json();
      if (data.status === 'connected' || data.status === 'ACTIVE') {
        setIsAlreadyConnected(true);
        setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'connected' }));
      } else {
        setIsAlreadyConnected(false);
        setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'idle' }));
      }
    } catch {
      setIsAlreadyConnected(false);
      setConnectionStatus(prev => ({ ...prev, [selectedTool.slug]: 'idle' }));
    } finally {
      setConnectingTool(false);
    }
  };

  // Composio API key is now hardcoded in the backend, so no need to check

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: 'rgba(10,10,20,0.55)', backdropFilter: 'blur(12px)' }}
    >
      <div className="w-full h-full flex max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-[rgba(255,245,245,0.1)] bg-[rgba(255,245,245,0.05)] backdrop-blur-xl relative">
        <div className="w-[400px] h-full bg-white/10 border-r border-white/10 p-4 flex flex-col backdrop-blur-xl" style={{boxShadow:'0 4px 24px -1px rgba(0,0,0,0.18)'}}>
          <div className="mb-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="bg-[rgba(255,245,245,0.05)] border-[rgba(255,245,245,0.1)] text-[#fff5f5] placeholder-[#fff5f5]/40 backdrop-blur-md"
              onPaste={stopClipboardPropagation}
              onCopy={stopClipboardPropagation}
              onCut={stopClipboardPropagation}
            />
          </div>
          <div className="overflow-y-auto h-[calc(100%-60px)] pr-1 scrollbar-thin scrollbar-thumb-[rgba(255,245,245,0.12)] scrollbar-track-transparent scrollbar-thumb-rounded-full">
            {loadingTools ? (
              <div className="text-[#fff5f5] text-center mt-8">Loading tools...</div>
            ) : filteredTools.map(tool => (
              <div
                key={tool.slug}
                onClick={() => handleToolClick(tool)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 border border-[rgba(255,245,245,0.08)] bg-[rgba(30,30,30,0.4)] hover:bg-[rgba(30,30,30,0.6)] hover:border-[rgba(255,245,245,0.18)] backdrop-blur-md ${selectedTool?.slug === tool.slug ? 'bg-[rgba(0,0,0,0.7)] border-[rgba(255,245,245,0.18)] shadow-lg' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {tool.logo || tool.meta?.logo ? (
                    <img src={tool.logo || tool.meta?.logo} alt={tool.name} className="w-8 h-8 rounded-lg bg-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#fff5f5] text-lg font-bold">
                      {tool.name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-[#fff5f5] font-medium text-lg truncate max-w-[180px]">{tool.name}</div>
                </div>
                {(tool.meta?.description || tool.description) && (
                  <div className="text-[#fff5f5]/70 text-sm leading-relaxed mt-1 line-clamp-2 max-w-full break-words">
                    {tool.meta?.description || tool.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-10 relative flex flex-col min-h-0 bg-[rgba(255,245,245,0.05)] backdrop-blur-xl">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-lg hover:bg-[rgba(255,245,245,0.1)] transition-colors duration-200 border border-[rgba(255,245,245,0.1)] backdrop-blur-md"
          >
            <X size={24} className="text-[#fff5f5]" />
          </button>
          {selectedTool ? (
            <div className="flex flex-col h-full">
              <div className="flex flex-col mb-12 flex-shrink-0 w-full">
                <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg border border-[rgba(255,245,245,0.1)] mb-4">
                  {selectedTool.logo || selectedTool.meta?.logo ? (
                    <img src={selectedTool.logo || selectedTool.meta?.logo} alt={selectedTool.name} className="w-10 h-10" />
                  ) : (
                    <div className="text-[#fff5f5] text-3xl font-bold">
                      {selectedTool.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex w-full max-w-2xl items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-semibold text-[#fff5f5] mb-1 line-clamp-2 max-w-full break-words">
                      {selectedTool.name}
                    </h3>
                    {(selectedTool.meta?.description || selectedTool.description) && (
                      <p className="text-[#fff5f5]/80 text-base max-w-full leading-relaxed line-clamp-2 break-words">
                        {selectedTool.meta?.description || selectedTool.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
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
                            ${connectionStatus[selectedTool?.slug] === 'idle' || connectionStatus[selectedTool?.slug] === 'connecting' ? 'bg-[rgba(255,245,245,0.05)] border-[rgba(255,245,245,0.2)] text-[#fff5f5]' : ''}`}
                          disabled={loadingActions || connectingTool}
                        >
                          {connectionStatus[selectedTool?.slug] === 'failed'
                            ? 'Failed'
                            : connectionStatus[selectedTool?.slug] === 'waiting'
                              ? 'Waiting... (click reload to check)'
                              : connectingTool
                                ? 'Connecting...'
                                : (loadingActions ? 'Loading Actions...' : 'Connect')}
                        </button>
                      )}
                      <button
                        onClick={handleManualReload}
                        className="p-2 rounded-lg border border-[rgba(255,245,245,0.2)] bg-[rgba(255,245,245,0.08)] text-[#fff5f5] hover:bg-[rgba(255,245,245,0.15)] transition-all duration-200"
                        disabled={connectingTool}
                        title="Reload connection status"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col flex-grow min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-[#fff5f5] flex-shrink-0">Available Actions</h4>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm border text-sm
                      ${selectedActionNames.length > 0 ? 'bg-cyan-700 text-white hover:bg-cyan-800 border-cyan-700' : 'bg-gray-700 text-gray-300 border-gray-700 cursor-not-allowed'}`}
                    disabled={selectedActionNames.length === 0}
                    onClick={handleAddActionsToAgent}
                  >
                    Add Actions to Agent
                  </button>
                </div>
                {selectedActionNames.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 w-full">
                    {selectedActionNames.map(name => (
                      <span
                        key={name}
                        className="flex items-center gap-1 px-3 py-1 bg-cyan-900/40 border border-cyan-400 text-cyan-100 rounded-full text-xs cursor-pointer hover:bg-cyan-800 whitespace-pre-line max-w-xs break-all"
                        onClick={() => setSelectedActionNames(prev => prev.filter(a => a !== name))}
                      >
                        {name}
                        <span className="ml-1 text-cyan-300 hover:text-red-400">×</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-[rgba(255,245,245,0.12)] scrollbar-track-transparent scrollbar-thumb-rounded-full">
                  <div className="grid grid-cols-2 gap-4 max-w-4xl pr-2">
                    {actions.map((action, index) => {
                      const isSelected = selectedActionNames.includes(action.name);
                      return (
                        <div
                          key={`${action.name}-${index}`}
                          className={`p-4 rounded-xl border shadow-sm backdrop-blur-md cursor-pointer transition-all duration-150
                            ${isSelected ? 'bg-cyan-900/40 border-cyan-400 ring-2 ring-cyan-400' : 'bg-[rgba(30,30,30,0.4)] border-[rgba(255,245,245,0.12)] hover:bg-[rgba(30,30,30,0.6)] hover:border-cyan-700'}`}
                          onClick={() => toggleAction(action)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-[#fff5f5] font-medium text-base truncate max-w-[140px]">{action.name}</div>
                            {isSelected && <Check className="text-cyan-400" size={18} />}
                          </div>
                          {action.description && (
                            <div className="text-[#fff5f5]/70 text-sm mt-1 line-clamp-2 max-w-full break-words">{action.description}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#fff5f5]/60 text-lg">
              Select a tool to view details
            </div>
          )}
        </div>
      </div>
      {showAuthModal && authModalType && (
        <Dialog open={showAuthModal} onOpenChange={(open) => { if(!open) { setShowAuthModal(false); setAuthError(null); setApiKey(''); setClientId(''); setClientSecret('');} }}>
          <DialogContent className="bg-[rgba(30,30,30,0.8)] border-[rgba(255,245,245,0.12)] text-[#fff5f5] backdrop-blur-md">
            <DialogHeader>
              <DialogTitle>
                {authModalType === 'api_key' ? `Enter API Key for ${selectedTool?.name}` : `Enter Credentials for ${selectedTool?.name}`}
              </DialogTitle>
              <DialogDescription className="text-[#fff5f5]/70 pt-2">
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

export default ToolsWindow; 