import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt, apiKey, modelProvider, modelName } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // For orchestrator, API key is not required (uses internal service)
    if (modelProvider !== 'orchestrator' && !apiKey) {
      return NextResponse.json({
        success: false,
        error: `API key is required for ${modelProvider}`
      }, { status: 400 });
    }

    // Handle orchestrator separately
    if (modelProvider === 'orchestrator') {
      try {
        // Get the last user message
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'user') {
          return NextResponse.json({ error: 'No user message found' }, { status: 400 });
        }

        // Prepare message for orchestrator
        let fullMessage = lastMessage.content;
        if (systemPrompt) {
          fullMessage = `${systemPrompt}\n\nUser: ${lastMessage.content}`;
        }

        // Call orchestrator API
        const orchestratorResponse = await fetch('http://localhost:5001/api/orchestrator/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: fullMessage,
            context: {
              timestamp: new Date().toISOString(),
              frontend: 'agent-flow-chat',
              system_prompt: systemPrompt,
              conversation_history: messages.slice(0, -1) // All messages except the last one
            },
            workspace: 'chat_with_anything'
          })
        });

        if (!orchestratorResponse.ok) {
          throw new Error(`Orchestrator API failed: ${orchestratorResponse.status}`);
        }

        const result = await orchestratorResponse.json();

        // Orchestrator returns response directly, no success field needed
        return NextResponse.json({
          success: true,
          response: result.response,
          model: modelName,
          provider: modelProvider
        });

      } catch (error: any) {
        console.error('Orchestrator API error:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to get orchestrator response',
          details: error.message
        }, { status: 500 });
      }
    }

    // Create the appropriate chat model based on provider
    let chatModel;

    try {
      switch (modelProvider) {
        case 'openai':
          chatModel = new ChatOpenAI({
            apiKey: apiKey,
            model: modelName || 'gpt-4o',
            temperature: 0.7,
            maxRetries: 2,
          });
          break;

        case 'anthropic':
          chatModel = new ChatAnthropic({
            apiKey: apiKey,
            model: modelName || 'claude-3-5-sonnet-20240620',
            temperature: 0.7,
            maxRetries: 2,
          });
          break;

        case 'google':
          chatModel = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: modelName || 'gemini-2.5-pro',
            temperature: 0.7,
            maxRetries: 2,
          });
          break;

        default:
          return NextResponse.json({ error: 'Invalid model provider' }, { status: 400 });
      }
    } catch (error: any) {
      return NextResponse.json({ 
        error: 'Failed to initialize chat model', 
        details: error.message 
      }, { status: 400 });
    }

    // Convert messages to LangChain format
    const langchainMessages = [];
    
    // Add system message if provided
    if (systemPrompt) {
      langchainMessages.push(new SystemMessage(systemPrompt));
    }
    
    // Convert conversation messages
    for (const message of messages) {
      if (message.role === 'user') {
        langchainMessages.push(new HumanMessage(message.content));
      } else if (message.role === 'assistant') {
        langchainMessages.push(new AIMessage(message.content));
      }
    }

    // Get the last user message for the response
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 });
    }

    // Call the LLM
    try {
      const response = await chatModel.invoke(langchainMessages);
      
      let responseContent = '';
      if (typeof response.content === 'string') {
        responseContent = response.content;
      } else if (Array.isArray(response.content)) {
        responseContent = response.content.map(c => 
          typeof c === 'string' ? c : c.text || ''
        ).join('');
      } else {
        responseContent = String(response.content);
      }

      return NextResponse.json({
        success: true,
        response: responseContent,
        model: modelName,
        provider: modelProvider
      });

    } catch (error: any) {
      console.error('LLM API error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get AI response',
        details: error.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
