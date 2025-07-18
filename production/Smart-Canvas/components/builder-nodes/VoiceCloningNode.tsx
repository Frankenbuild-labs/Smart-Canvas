"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Mic, Upload, Play, Pause, Download, Copy, Loader2, UserCheck, Wand2 } from 'lucide-react';

export interface VoiceCloningNodeData {
  label: string;
  text: string;
  provider: 'elevenlabs';
  apiKey: string;
  voiceName: string;
  voiceDescription?: string;
  sourceAudio?: {
    url: string;
    name: string;
    duration?: number;
  };
  clonedVoiceId?: string;
  generatedAudio?: {
    url: string;
    text: string;
    voiceId: string;
    timestamp: number;
  };
  isTraining?: boolean;
  isGenerating?: boolean;
  error?: string;
  onNodeDataChange?: (id: string, data: Partial<VoiceCloningNodeData>) => void;
}

const VoiceCloningNode: React.FC<NodeProps<VoiceCloningNodeData>> = ({ id, data }) => {
  const [text, setText] = useState(data.text || '');
  const [voiceName, setVoiceName] = useState(data.voiceName || '');
  const [voiceDescription, setVoiceDescription] = useState(data.voiceDescription || '');
  const [isTraining, setIsTraining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceAudio, setSourceAudio] = useState(data.sourceAudio || null);
  const [generatedAudio, setGeneratedAudio] = useState(data.generatedAudio || null);
  const [error, setError] = useState(data.error || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setText(data.text || '');
    setVoiceName(data.voiceName || '');
    setVoiceDescription(data.voiceDescription || '');
    setSourceAudio(data.sourceAudio || null);
    setGeneratedAudio(data.generatedAudio || null);
    setError(data.error || '');
  }, [data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { [name]: value });
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setError('Please select a valid audio file');
      return;
    }

    // Validate file size (max 25MB for voice cloning)
    if (file.size > 25 * 1024 * 1024) {
      setError('Audio file must be less than 25MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const audioUrl = event.target?.result as string;
      
      // Get audio duration
      const audio = new Audio(audioUrl);
      audio.onloadedmetadata = () => {
        const newSourceAudio = {
          url: audioUrl,
          name: file.name,
          duration: audio.duration
        };
        
        setSourceAudio(newSourceAudio);
        setError('');
        
        if (data.onNodeDataChange) {
          data.onNodeDataChange(id, { sourceAudio: newSourceAudio, error: '' });
        }
      };
    };
    
    reader.readAsDataURL(file);
  };

  const cloneVoice = async () => {
    if (!sourceAudio || !voiceName.trim() || !data.apiKey || isTraining) return;

    setIsTraining(true);
    setError('');

    try {
      const response = await fetch('/api/voice-cloning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: data.provider,
          apiKey: data.apiKey,
          voiceName: voiceName.trim(),
          voiceDescription: voiceDescription.trim(),
          audioUrl: sourceAudio.url,
          action: 'clone'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to clone voice: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.voiceId) {
        if (data.onNodeDataChange) {
          data.onNodeDataChange(id, { 
            clonedVoiceId: result.voiceId,
            isTraining: false,
            error: ''
          });
        }
      } else {
        throw new Error(result.error || 'Failed to clone voice');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to clone voice';
      setError(errorMessage);
      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, { error: errorMessage, isTraining: false });
      }
    } finally {
      setIsTraining(false);
    }
  };

  const generateSpeech = async () => {
    if (!text.trim() || !data.clonedVoiceId || !data.apiKey || isGenerating) return;

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/voice-cloning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: data.provider,
          apiKey: data.apiKey,
          voiceId: data.clonedVoiceId,
          text: text.trim(),
          action: 'generate'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate speech: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.audioUrl) {
        const newAudio = {
          url: result.audioUrl,
          text: text.trim(),
          voiceId: data.clonedVoiceId,
          timestamp: Date.now()
        };
        
        setGeneratedAudio(newAudio);
        
        if (data.onNodeDataChange) {
          data.onNodeDataChange(id, { 
            generatedAudio: newAudio,
            isGenerating: false,
            error: ''
          });
        }
      } else {
        throw new Error(result.error || 'Failed to generate speech');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate speech';
      setError(errorMessage);
      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, { error: errorMessage, isGenerating: false });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = () => {
    if (audioRef.current && generatedAudio) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const downloadAudio = () => {
    if (generatedAudio?.url) {
      const link = document.createElement('a');
      link.href = generatedAudio.url;
      link.download = `cloned-voice-${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyAudioUrl = () => {
    if (generatedAudio?.url) {
      navigator.clipboard.writeText(generatedAudio.url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (data.clonedVoiceId) {
        generateSpeech();
      } else {
        cloneVoice();
      }
    }
  };

  return (
    <div className="bg-white border-2 rounded-lg shadow-lg min-w-[350px] border-gray-300">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <UserCheck size={18} />
          <span className="font-medium">{data.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            name="provider"
            value={data.provider}
            onChange={handleInputChange}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            name="apiKey"
            value={data.apiKey}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter API key..."
          />
        </div>

        {/* Voice Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voice Name</label>
          <input
            type="text"
            name="voiceName"
            value={voiceName}
            onChange={(e) => {
              setVoiceName(e.target.value);
              handleInputChange(e);
            }}
            onPaste={(e) => e.stopPropagation()}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter a name for the cloned voice..."
          />
        </div>

        {/* Voice Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <input
            type="text"
            name="voiceDescription"
            value={voiceDescription}
            onChange={(e) => {
              setVoiceDescription(e.target.value);
              handleInputChange(e);
            }}
            onPaste={(e) => e.stopPropagation()}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe the voice characteristics..."
          />
        </div>

        {/* Source Audio Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Audio</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {sourceAudio ? (
              <div>
                <audio
                  src={sourceAudio.url}
                  controls
                  className="w-full mb-2"
                />
                <p className="text-sm text-gray-600 truncate">{sourceAudio.name}</p>
                {sourceAudio.duration && (
                  <p className="text-xs text-gray-500">Duration: {Math.round(sourceAudio.duration)}s</p>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Change Audio
                </button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Upload Audio Sample
                </button>
                <p className="text-xs text-gray-500 mt-1">MP3, WAV up to 25MB (min 30s recommended)</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
          />
        </div>

        {/* Clone Voice Button */}
        {!data.clonedVoiceId && (
          <button
            onClick={cloneVoice}
            disabled={!sourceAudio || !voiceName.trim() || !data.apiKey || isTraining}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-4 rounded font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTraining ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Training Voice...
              </>
            ) : (
              <>
                <UserCheck size={16} />
                Clone Voice
              </>
            )}
          </button>
        )}

        {/* Voice Cloned Status */}
        {data.clonedVoiceId && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-green-600" />
              <span className="text-green-700 text-sm font-medium">Voice Cloned Successfully!</span>
            </div>
            <p className="text-green-600 text-xs mt-1">Voice ID: {data.clonedVoiceId}</p>
          </div>
        )}

        {/* Text Input for Generation */}
        {data.clonedVoiceId && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text to Speak</label>
              <textarea
                name="text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  handleInputChange(e);
                }}
                onKeyDown={handleKeyDown}
                onPaste={(e) => e.stopPropagation()}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Enter text to speak with cloned voice..."
              />
            </div>

            {/* Generate Speech Button */}
            <button
              onClick={generateSpeech}
              disabled={!text.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Generate Speech
                </>
              )}
            </button>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Generated Audio Display */}
        {generatedAudio && (
          <div className="border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Generated Audio</span>
              <div className="flex gap-2">
                <button
                  onClick={playAudio}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={copyAudioUrl}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Copy URL"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={downloadAudio}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={generatedAudio.url}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              className="w-full"
              controls
            />
            <p className="text-xs text-gray-500 mt-2 truncate">{generatedAudio.text}</p>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default VoiceCloningNode;
