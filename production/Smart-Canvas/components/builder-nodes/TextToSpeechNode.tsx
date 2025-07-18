"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Volume2, Play, Pause, Download, Copy, Loader2, Mic, Settings } from 'lucide-react';

export interface TextToSpeechNodeData {
  label: string;
  text: string;
  provider: 'elevenlabs' | 'openai' | 'google';
  voice: string;
  apiKey: string;
  speed?: number;
  pitch?: number;
  stability?: number; // ElevenLabs specific
  similarityBoost?: number; // ElevenLabs specific
  model?: string;
  generatedAudio?: {
    url: string;
    text: string;
    voice: string;
    timestamp: number;
  };
  isLoading?: boolean;
  error?: string;
  onNodeDataChange?: (id: string, data: Partial<TextToSpeechNodeData>) => void;
}

const providerVoices = {
  elevenlabs: [
    { id: 'rachel', name: 'Rachel (Calm)' },
    { id: 'domi', name: 'Domi (Strong)' },
    { id: 'bella', name: 'Bella (Soft)' },
    { id: 'antoni', name: 'Antoni (Well-rounded)' },
    { id: 'elli', name: 'Elli (Emotional)' },
    { id: 'josh', name: 'Josh (Deep)' },
    { id: 'arnold', name: 'Arnold (Crisp)' },
    { id: 'adam', name: 'Adam (Narrative)' },
    { id: 'sam', name: 'Sam (Raspy)' }
  ],
  openai: [
    { id: 'alloy', name: 'Alloy' },
    { id: 'echo', name: 'Echo' },
    { id: 'fable', name: 'Fable' },
    { id: 'onyx', name: 'Onyx' },
    { id: 'nova', name: 'Nova' },
    { id: 'shimmer', name: 'Shimmer' }
  ],

  google: [
    { id: 'en-US-Wavenet-D', name: 'US Female (Wavenet-D)' },
    { id: 'en-US-Wavenet-A', name: 'US Male (Wavenet-A)' },
    { id: 'en-GB-Wavenet-A', name: 'UK Female (Wavenet-A)' },
    { id: 'en-GB-Wavenet-B', name: 'UK Male (Wavenet-B)' },
    { id: 'en-AU-Wavenet-A', name: 'AU Female (Wavenet-A)' },
    { id: 'en-AU-Wavenet-B', name: 'AU Male (Wavenet-B)' }
  ]
};

const TextToSpeechNode: React.FC<NodeProps<TextToSpeechNodeData>> = ({ id, data }) => {
  const [text, setText] = useState(data.text || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(data.generatedAudio || null);
  const [error, setError] = useState(data.error || '');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setText(data.text || '');
    setGeneratedAudio(data.generatedAudio || null);
    setError(data.error || '');
  }, [data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newData: Partial<TextToSpeechNodeData> = { [name]: value };

    // Reset voice when provider changes
    if (name === 'provider') {
      const newProvider = value as keyof typeof providerVoices;
      newData.voice = providerVoices[newProvider]?.[0]?.id || '';
    }

    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, newData);
    }
  };

  const generateSpeech = async () => {
    if (!text.trim() || !data.apiKey || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          provider: data.provider,
          voice: data.voice,
          apiKey: data.apiKey,
          speed: data.speed || 1.0,
          pitch: data.pitch || 0,
          stability: data.stability || 0.5,
          similarityBoost: data.similarityBoost || 0.5,
          model: data.model || 'tts-1'
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
          voice: data.voice,
          timestamp: Date.now()
        };
        
        setGeneratedAudio(newAudio);
        
        if (data.onNodeDataChange) {
          data.onNodeDataChange(id, { 
            generatedAudio: newAudio,
            isLoading: false,
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
        data.onNodeDataChange(id, { error: errorMessage, isLoading: false });
      }
    } finally {
      setIsLoading(false);
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
      link.download = `speech-${Date.now()}.mp3`;
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
      generateSpeech();
    }
  };

  return (
    <div className="bg-white border-2 rounded-lg shadow-lg min-w-[350px] border-gray-300">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Volume2 size={18} />
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
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="elevenlabs">ElevenLabs</option>
            <option value="openai">OpenAI</option>
            <option value="google">Google Cloud TTS</option>
          </select>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
          <select
            name="voice"
            value={data.voice}
            onChange={handleInputChange}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {providerVoices[data.provider]?.map(voice => (
              <option key={voice.id} value={voice.id}>{voice.name}</option>
            ))}
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
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter API key..."
          />
        </div>

        {/* Text Input */}
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
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="Enter text to convert to speech..."
          />
        </div>

        {/* Voice Settings */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Speed</label>
            <input
              type="range"
              name="speed"
              value={data.speed || 1.0}
              onChange={handleInputChange}
              min="0.25"
              max="4.0"
              step="0.25"
              className="w-full"
            />
            <span className="text-xs text-gray-500">{data.speed || 1.0}x</span>
          </div>
          {data.provider === 'elevenlabs' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stability</label>
              <input
                type="range"
                name="stability"
                value={data.stability || 0.5}
                onChange={handleInputChange}
                min="0"
                max="1"
                step="0.1"
                className="w-full"
              />
              <span className="text-xs text-gray-500">{data.stability || 0.5}</span>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={generateSpeech}
          disabled={!text.trim() || !data.apiKey || isLoading}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Mic size={16} />
              Generate Speech
            </>
          )}
        </button>

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

export default TextToSpeechNode;
