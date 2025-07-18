import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { AIMessage, HumanMessage, ToolMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, START, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";

import { AuthConfigTypes, AuthSchemeTypes, Composio, } from "@composio/core";
import {LangchainToolset} from '@composio/langchain'

const AgentRequestBodySchema = z.object({
  graphJson: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }),
  chatInput: z.string().optional(), // For chat with anything nodes
});

const GraphState = Annotation.Root({
  currentData: Annotation<any>(),
  originalQuery: Annotation<string>(),
  graphNodes: Annotation<any[]>(),
  graphEdges: Annotation<any[]>(),
  steps: Annotation<string[]>(),
  currentNodeId: Annotation<string | null>(),
  executionComplete: Annotation<boolean>(),
  chatInput: Annotation<string | null>(), // For chat mode input
  nodeOutputs: Annotation<Record<string, any>>(), // Store outputs from all nodes
  processedNodes: Annotation<Set<string>>() // Track which nodes have been processed
});

type GraphStateType = typeof GraphState.State;

async function executeInput(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing input node");

  const startNode = state.graphNodes.find(n => n.type === 'customInput');
  if (!startNode) throw new Error("Graph must contain a 'customInput' node.");

  let originalQuery: string;

  // Check if node is in chat mode
  if (startNode.data?.chatMode) {
    // In chat mode, use the chat input from context or a default
    originalQuery = state.chatInput || startNode.data?.query || "Process this request";
    console.log("[LangGraph] Chat mode enabled - using chat input:", originalQuery);
  } else {
    // Regular mode - require query in the node
    if (!startNode.data?.query?.trim()) {
      throw new Error("'customInput' node must contain a non-empty query or be in chat mode.");
    }
    originalQuery = startNode.data.query;
  }

  const steps = [...state.steps, `Start: Initial query = "${originalQuery}"`];

  const outgoingEdge = state.graphEdges.find(edge => edge.source === startNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [startNode.id]: originalQuery };
  const updatedProcessedNodes = new Set(state.processedNodes).add(startNode.id);

  return {
    currentData: originalQuery,
    originalQuery,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeLLM(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing LLM node");
  
  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`LLM Node with ID ${state.currentNodeId} not found`);

  const { apiKey, systemPrompt: nodeSystemPrompt, modelProvider, modelName } = currentNode.data;

  // Check for orchestrator provider first (doesn't need API key)
  if (modelProvider === 'orchestrator') {
    return await executeOrchestratorLLM(state, currentNode);
  }

  if (!apiKey) throw new Error(`LLM Node ${currentNode.id} requires an apiKey.`);

  let llm;
  switch (modelProvider) {
    case 'anthropic': llm = new ChatAnthropic({ apiKey, temperature: 0.7, modelName }); break;
    case 'google': llm = new ChatGoogleGenerativeAI({ apiKey, temperature: 0.7, model: modelName }); break;
    case 'openai': default: llm = new ChatOpenAI({ apiKey, temperature: 0.7, modelName }); break;
  }
  
  const contextSystemPrompt = `Final Goal: ${state.originalQuery}\n\nCurrent Status/Input: ${String(state.currentData)}`;
  const combinedSystemPrompt = `${contextSystemPrompt}\n\n${nodeSystemPrompt || ''}`.trim();

  const messages: BaseMessage[] = [
    new SystemMessage(combinedSystemPrompt),
    new HumanMessage(String(state.currentData))
  ];

  console.log(`[LLM Node ${currentNode.id}] Invoking LLM with System Prompt: "${combinedSystemPrompt}"`);
  const response = await llm.invoke(messages);
  
  const steps = [...state.steps, `Result (LLM ${currentNode.id}): ${typeof response.content === 'string' ? response.content.substring(0,100)+'...' : JSON.stringify(response.content)}`];
  
  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: response.content };
  const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

  return {
    currentData: response.content,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeAgent(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Agent node");
  
  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Agent Node with ID ${state.currentNodeId} not found`);

  const {
    llmApiKey, systemPrompt: nodeSystemPrompt, modelProvider, modelName,
    composioApiKey, allowedTools: allowedToolsString,
  } = currentNode.data;

  // Check for orchestrator provider first (doesn't need API key)
  if (modelProvider === 'orchestrator') {
    return await executeOrchestratorAgent(state, currentNode);
  }

  if (!llmApiKey) throw new Error(`Agent Node ${currentNode.id} requires an llmApiKey.`);

  let agentLlm;
  switch (modelProvider) {
    case 'anthropic': agentLlm = new ChatAnthropic({ apiKey: llmApiKey, temperature: 0.7, modelName }); break;
    case 'google': agentLlm = new ChatGoogleGenerativeAI({ apiKey: llmApiKey, temperature: 0.7, model: modelName }); break;
    case 'openai': default: agentLlm = new ChatOpenAI({ apiKey: llmApiKey, temperature: 0.7, modelName }); break;
  }

  let toolsForAgent: any[] = [];
  const allowedTools = (allowedToolsString || '').split(',').map((t: string) => t.trim()).filter((t: string) => t);

  if (composioApiKey && allowedTools.length > 0) {
    try {
      const composio = new Composio({
        apiKey: composioApiKey,
        toolset: new LangchainToolset()
      })
      console.log(`[Agent Node ${currentNode.id}] Fetching tools: ${allowedTools.join(', ')}`);
      toolsForAgent = await composio.getTools('user123', { tools: allowedTools });
      console.log(`[Agent Node ${currentNode.id}] Loaded ${toolsForAgent.length} tools.`);
    } catch (error: any) {
      console.error(`[Agent Node ${currentNode.id}] Failed to load tools:`, error);
    }
  }

  const modelWithTools = agentLlm.bindTools(toolsForAgent);
  const contextSystemPrompt = `Final Goal: ${state.originalQuery}\n\nCurrent Status/Input: ${String(state.currentData)}`;
  const combinedSystemPrompt = `${contextSystemPrompt}\n\n${nodeSystemPrompt || ''}`.trim();

  let agentMessages: BaseMessage[] = [
    new SystemMessage(combinedSystemPrompt),
    new HumanMessage(String(state.currentData))
  ];

  let finalAgentOutput: any = null;
  let steps = [...state.steps];
  const maxTurns = 5;
  let turns = 0;

  while (turns < maxTurns) {
    turns++;
    steps.push(`Agent ${currentNode.id} Turn ${turns}: Calling LLM`);

    const response: AIMessage = await modelWithTools.invoke(agentMessages);
    agentMessages.push(response);

    const toolCalls = response.additional_kwargs?.tool_calls;
    if (toolCalls && toolCalls.length > 0 && toolsForAgent.length > 0) {
      steps.push(`Agent ${currentNode.id} Turn ${turns}: LLM requested tools: ${toolCalls.map((tc: any) => tc.function.name).join(', ')}`);

      const toolMessages: ToolMessage[] = [];
      await Promise.all(toolCalls.map(async (toolCall: any) => {
        const toolToCall = toolsForAgent.find((tool) => tool.name === toolCall.function.name);
        let toolOutputContent: any;

        if (toolToCall) {
          try {
            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments || '{}');
            } catch (parseError) {
              throw new Error(`Invalid arguments format: ${toolCall.function.arguments}`);
            }
            toolOutputContent = await toolToCall.invoke(args);
            steps.push(`Agent ${currentNode.id} Turn ${turns}: Executed ${toolCall.function.name}. Result: ${JSON.stringify(toolOutputContent).substring(0,100)}...`);
          } catch (toolError: any) {
            toolOutputContent = `Error executing tool: ${toolError.message}`;
            steps.push(`Agent ${currentNode.id} Turn ${turns}: Error executing ${toolCall.function.name}: ${toolError.message}`);
          }
        } else {
          toolOutputContent = `Error: Tool \"${toolCall.function.name}\" not found.`;
          steps.push(`Agent ${currentNode.id} Turn ${turns}: Tool ${toolCall.function.name} not found.`);
        }
        
        toolMessages.push(new ToolMessage({
          tool_call_id: toolCall.id!,
          content: toolOutputContent,
          name: toolCall.function.name 
        }));
      }));

      agentMessages = agentMessages.concat(toolMessages);
    } else {
      finalAgentOutput = response.content;
      steps.push(`Result (Agent ${currentNode.id}): ${typeof finalAgentOutput === 'string' ? finalAgentOutput.substring(0,100)+'...' : JSON.stringify(finalAgentOutput)}`);
      break;
    }
  }

  if (turns >= maxTurns && finalAgentOutput === null) {
    steps.push(`Warning (Agent ${currentNode.id}): Reached max iterations after tool calls.`);
    const lastMessage = agentMessages[agentMessages.length - 1];
    finalAgentOutput = lastMessage?.content ?? `Agent reached max iterations (${maxTurns}).`;
  }

  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: finalAgentOutput };
  const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

  return {
    currentData: finalAgentOutput,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeVectorStore(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Vector Store node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Vector Store Node with ID ${state.currentNodeId} not found`);

  const {
    storeType, apiKey, operation, indexName, namespace, topK, similarityThreshold, metadataFilter
  } = currentNode.data;

  try {
    let result: any;
    const inputData = String(state.currentData);

    switch (storeType) {
      case 'pinecone':
        if (!apiKey) throw new Error("Pinecone requires an API key");
        result = await executePineconeOperation(operation, apiKey, indexName, namespace, inputData, topK, similarityThreshold, metadataFilter);
        break;
      case 'chroma':
        result = await executeChromaOperation(operation, indexName, inputData, topK, similarityThreshold, metadataFilter);
        break;
      case 'faiss':
        result = await executeFAISSOperation(operation, indexName, inputData, topK, similarityThreshold);
        break;
      default:
        throw new Error(`Unsupported vector store type: ${storeType}`);
    }

    const steps = [...state.steps, `Vector Store (${storeType}): ${operation} operation completed`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: result,
      steps,
      currentNodeId: nextNodeId
    };

  } catch (error: any) {
    console.error(`[Vector Store ${currentNode.id}] Error:`, error);
    const steps = [...state.steps, `Error (Vector Store ${currentNode.id}): ${error.message}`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: `Error: ${error.message}`,
      steps,
      currentNodeId: nextNodeId
    };
  }
}

// Helper functions for vector store operations
async function executePineconeOperation(operation: string, apiKey: string, indexName: string, namespace: string, data: string, topK: number, threshold: number, metadataFilter: string) {
  // Placeholder implementation - would integrate with Pinecone SDK
  console.log(`[Pinecone] ${operation} operation on index ${indexName}`);

  switch (operation) {
    case 'search':
      return `Found ${topK} similar vectors for query: "${data.substring(0, 50)}..."`;
    case 'store':
      return `Stored vector for: "${data.substring(0, 50)}..."`;
    case 'retrieve':
      return `Retrieved vectors from index ${indexName}`;
    case 'delete':
      return `Deleted vectors from index ${indexName}`;
    default:
      throw new Error(`Unsupported Pinecone operation: ${operation}`);
  }
}

async function executeChromaOperation(operation: string, collectionName: string, data: string, topK: number, threshold: number, metadataFilter: string) {
  // Placeholder implementation - would integrate with ChromaDB
  console.log(`[Chroma] ${operation} operation on collection ${collectionName}`);

  switch (operation) {
    case 'search':
      return `Found ${topK} similar vectors for query: "${data.substring(0, 50)}..."`;
    case 'store':
      return `Stored vector for: "${data.substring(0, 50)}..."`;
    case 'retrieve':
      return `Retrieved vectors from collection ${collectionName}`;
    case 'delete':
      return `Deleted vectors from collection ${collectionName}`;
    default:
      throw new Error(`Unsupported Chroma operation: ${operation}`);
  }
}

async function executeFAISSOperation(operation: string, indexName: string, data: string, topK: number, threshold: number) {
  // Placeholder implementation - would integrate with FAISS
  console.log(`[FAISS] ${operation} operation on index ${indexName}`);

  switch (operation) {
    case 'search':
      return `Found ${topK} similar vectors for query: "${data.substring(0, 50)}..."`;
    case 'store':
      return `Stored vector for: "${data.substring(0, 50)}..."`;
    case 'retrieve':
      return `Retrieved vectors from index ${indexName}`;
    default:
      throw new Error(`Unsupported FAISS operation: ${operation}`);
  }
}

async function executeHuggingFace(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Hugging Face node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Hugging Face Node with ID ${state.currentNodeId} not found`);

  const {
    taskType, modelName, apiKey, maxTokens, temperature, topP, customEndpoint, useCustomModel
  } = currentNode.data;

  try {
    const inputData = String(state.currentData);
    const modelToUse = useCustomModel ? customEndpoint : modelName;

    let result: any;

    switch (taskType) {
      case 'text-generation':
        result = await executeHuggingFaceTextGeneration(modelToUse, inputData, apiKey, maxTokens, temperature, topP);
        break;
      case 'text-classification':
        result = await executeHuggingFaceTextClassification(modelToUse, inputData, apiKey);
        break;
      case 'embeddings':
        result = await executeHuggingFaceEmbeddings(modelToUse, inputData, apiKey);
        break;
      case 'summarization':
        result = await executeHuggingFaceSummarization(modelToUse, inputData, apiKey, maxTokens);
        break;
      case 'translation':
        result = await executeHuggingFaceTranslation(modelToUse, inputData, apiKey, maxTokens);
        break;
      case 'question-answering':
        result = await executeHuggingFaceQuestionAnswering(modelToUse, inputData, apiKey);
        break;
      default:
        throw new Error(`Unsupported Hugging Face task type: ${taskType}`);
    }

    const steps = [...state.steps, `Hugging Face (${taskType}): ${modelToUse} completed`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: result,
      steps,
      currentNodeId: nextNodeId
    };

  } catch (error: any) {
    console.error(`[Hugging Face ${currentNode.id}] Error:`, error);
    const steps = [...state.steps, `Error (Hugging Face ${currentNode.id}): ${error.message}`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: `Error: ${error.message}`,
      steps,
      currentNodeId: nextNodeId
    };
  }
}

// Helper functions for Hugging Face operations
async function executeHuggingFaceTextGeneration(model: string, input: string, apiKey: string, maxTokens: number, temperature: number, topP: number) {
  console.log(`[Hugging Face] Text generation with model ${model}`);
  // Placeholder implementation - would integrate with Hugging Face API
  return `Generated text from ${model}: "${input}" -> [Generated continuation with ${maxTokens} tokens, temp=${temperature}, top_p=${topP}]`;
}

async function executeHuggingFaceTextClassification(model: string, input: string, apiKey: string) {
  console.log(`[Hugging Face] Text classification with model ${model}`);
  // Placeholder implementation
  return `Classification result from ${model}: "${input}" -> [POSITIVE: 0.85, NEGATIVE: 0.15]`;
}

async function executeHuggingFaceEmbeddings(model: string, input: string, apiKey: string) {
  console.log(`[Hugging Face] Embeddings with model ${model}`);
  // Placeholder implementation
  return `Embeddings from ${model}: "${input}" -> [768-dimensional vector]`;
}

async function executeHuggingFaceSummarization(model: string, input: string, apiKey: string, maxTokens: number) {
  console.log(`[Hugging Face] Summarization with model ${model}`);
  // Placeholder implementation
  return `Summary from ${model}: "${input.substring(0, 50)}..." -> [Summarized in ${maxTokens} tokens]`;
}

async function executeHuggingFaceTranslation(model: string, input: string, apiKey: string, maxTokens: number) {
  console.log(`[Hugging Face] Translation with model ${model}`);
  // Placeholder implementation
  return `Translation from ${model}: "${input}" -> [Translated text in ${maxTokens} tokens]`;
}

async function executeHuggingFaceQuestionAnswering(model: string, input: string, apiKey: string) {
  console.log(`[Hugging Face] Question answering with model ${model}`);
  // Placeholder implementation
  return `Answer from ${model}: "${input}" -> [Generated answer based on context]`;
}

async function executeDatabase(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Database node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Database Node with ID ${state.currentNodeId} not found`);

  const {
    databaseType, connectionString, query, operation, collection, key, value, timeout
  } = currentNode.data;

  try {
    const inputData = String(state.currentData);
    let result: any;

    switch (databaseType) {
      case 'postgresql':
        result = await executePostgreSQLOperation(connectionString, operation, query, inputData);
        break;
      case 'mongodb':
        result = await executeMongoDBOperation(connectionString, operation, collection, query, inputData);
        break;
      case 'redis':
        result = await executeRedisOperation(connectionString, operation, key, value || inputData, timeout);
        break;
      default:
        throw new Error(`Unsupported database type: ${databaseType}`);
    }

    const steps = [...state.steps, `Database (${databaseType}): ${operation} operation completed`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: result,
      steps,
      currentNodeId: nextNodeId
    };

  } catch (error: any) {
    console.error(`[Database ${currentNode.id}] Error:`, error);
    const steps = [...state.steps, `Error (Database ${currentNode.id}): ${error.message}`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: `Error: ${error.message}`,
      steps,
      currentNodeId: nextNodeId
    };
  }
}

// Helper functions for database operations
async function executePostgreSQLOperation(connectionString: string, operation: string, query: string, inputData: string) {
  console.log(`[PostgreSQL] ${operation} operation`);
  // Placeholder implementation - would integrate with pg library

  switch (operation) {
    case 'select':
      return `PostgreSQL SELECT result: Found 3 rows matching query "${query}"`;
    case 'insert':
      return `PostgreSQL INSERT result: Inserted 1 row with data "${inputData.substring(0, 50)}..."`;
    case 'update':
      return `PostgreSQL UPDATE result: Updated 2 rows with query "${query}"`;
    case 'delete':
      return `PostgreSQL DELETE result: Deleted 1 row with query "${query}"`;
    default:
      throw new Error(`Unsupported PostgreSQL operation: ${operation}`);
  }
}

async function executeMongoDBOperation(connectionString: string, operation: string, collection: string, query: string, inputData: string) {
  console.log(`[MongoDB] ${operation} operation on collection ${collection}`);
  // Placeholder implementation - would integrate with mongodb library

  switch (operation) {
    case 'find':
      return `MongoDB FIND result: Found 2 documents in ${collection} matching query ${query}`;
    case 'insertOne':
      return `MongoDB INSERT result: Inserted document in ${collection} with data "${inputData.substring(0, 50)}..."`;
    case 'updateOne':
      return `MongoDB UPDATE result: Updated 1 document in ${collection} with query ${query}`;
    case 'deleteOne':
      return `MongoDB DELETE result: Deleted 1 document from ${collection} with query ${query}`;
    default:
      throw new Error(`Unsupported MongoDB operation: ${operation}`);
  }
}

async function executeRedisOperation(connectionString: string, operation: string, key: string, value: string, timeout: number) {
  console.log(`[Redis] ${operation} operation on key ${key}`);
  // Placeholder implementation - would integrate with redis library

  switch (operation) {
    case 'get':
      return `Redis GET result: Retrieved value for key "${key}": "cached_value_123"`;
    case 'set':
      return `Redis SET result: Set key "${key}" with value "${value.substring(0, 50)}..." (timeout: ${timeout}s)`;
    case 'del':
      return `Redis DEL result: Deleted key "${key}"`;
    case 'exists':
      return `Redis EXISTS result: Key "${key}" exists: true`;
    default:
      throw new Error(`Unsupported Redis operation: ${operation}`);
  }
}

async function executeFileStorage(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing File Storage node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`File Storage Node with ID ${state.currentNodeId} not found`);

  const {
    storageProvider, accessKeyId, secretAccessKey, region, bucketName, operation, fileName, prefix, contentType, makePublic
  } = currentNode.data;

  try {
    const inputData = String(state.currentData);
    let result: any;

    switch (storageProvider) {
      case 'aws-s3':
        result = await executeAWSS3Operation(accessKeyId, secretAccessKey, region, bucketName, operation, fileName, prefix, inputData, contentType, makePublic);
        break;
      default:
        throw new Error(`Unsupported storage provider: ${storageProvider}`);
    }

    const steps = [...state.steps, `File Storage (${storageProvider}): ${operation} operation completed`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: result,
      steps,
      currentNodeId: nextNodeId
    };

  } catch (error: any) {
    console.error(`[File Storage ${currentNode.id}] Error:`, error);
    const steps = [...state.steps, `Error (File Storage ${currentNode.id}): ${error.message}`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: `Error: ${error.message}`,
      steps,
      currentNodeId: nextNodeId
    };
  }
}

// Helper functions for AWS S3 operations
async function executeAWSS3Operation(accessKeyId: string, secretAccessKey: string, region: string, bucketName: string, operation: string, fileName: string, prefix: string, inputData: string, contentType: string, makePublic: boolean) {
  console.log(`[AWS S3] ${operation} operation in bucket ${bucketName}`);
  // Placeholder implementation - would integrate with AWS SDK

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials are required");
  }

  if (!bucketName) {
    throw new Error("Bucket name is required");
  }

  switch (operation) {
    case 'upload':
      if (!fileName) throw new Error("File name is required for upload");
      return `AWS S3 UPLOAD result: Uploaded "${fileName}" to bucket "${bucketName}" in region "${region}". Content-Type: ${contentType}. Public: ${makePublic}. Data: "${inputData.substring(0, 50)}..."`;

    case 'download':
      if (!fileName) throw new Error("File name is required for download");
      return `AWS S3 DOWNLOAD result: Downloaded "${fileName}" from bucket "${bucketName}". File content: [Binary data or text content]`;

    case 'list':
      const prefixText = prefix ? ` with prefix "${prefix}"` : '';
      return `AWS S3 LIST result: Found 5 files in bucket "${bucketName}"${prefixText}: file1.txt, file2.jpg, folder/file3.pdf, data.json, image.png`;

    case 'delete':
      if (!fileName) throw new Error("File name is required for delete");
      return `AWS S3 DELETE result: Deleted "${fileName}" from bucket "${bucketName}"`;

    case 'exists':
      if (!fileName) throw new Error("File name is required for exists check");
      return `AWS S3 EXISTS result: File "${fileName}" exists in bucket "${bucketName}": true`;

    default:
      throw new Error(`Unsupported AWS S3 operation: ${operation}`);
  }
}

// Helper function to get all connected input data for a node
function getConnectedInputData(nodeId: string, state: GraphStateType): any {
  const connectedData: any = {};

  // Find all edges that connect TO this node (incoming edges)
  const incomingEdges = state.graphEdges.filter(edge => edge.target === nodeId);

  console.log(`[Data Aggregation] Node ${nodeId} has ${incomingEdges.length} incoming connections`);
  console.log(`[Data Aggregation] Available node outputs:`, Object.keys(state.nodeOutputs));
  console.log(`[Data Aggregation] Processed nodes:`, Array.from(state.processedNodes));

  incomingEdges.forEach(edge => {
    const sourceNodeId = edge.source;
    const sourceNode = state.graphNodes.find(n => n.id === sourceNodeId);

    console.log(`[Data Aggregation] Checking edge from ${sourceNodeId} to ${nodeId}`);
    console.log(`[Data Aggregation] Source node found:`, !!sourceNode);
    console.log(`[Data Aggregation] Source node output available:`, !!state.nodeOutputs[sourceNodeId]);

    let nodeData = null;
    let dataSource = '';

    // First priority: Check workflow outputs (for nodes that have been executed)
    if (sourceNode && state.nodeOutputs[sourceNodeId]) {
      nodeData = state.nodeOutputs[sourceNodeId];
      dataSource = 'workflow';
      console.log(`[Data Aggregation] Found workflow output for ${sourceNodeId}:`, nodeData);
    }
    // Second priority: Check frontend node processedContent (for nodes with frontend data)
    else if (sourceNode && sourceNode.data?.processedContent) {
      nodeData = sourceNode.data.processedContent;
      dataSource = 'frontend';
      console.log(`[Data Aggregation] Found frontend processedContent for ${sourceNodeId}:`, nodeData);
    }
    // Third priority: Check for any other relevant data in the node
    else if (sourceNode && (sourceNode.data?.videoData || sourceNode.data?.extractedText || sourceNode.data?.generatedImage)) {
      // Handle legacy data structures
      if (sourceNode.data.videoData) {
        nodeData = {
          type: 'youtube',
          title: sourceNode.data.videoData.title || 'YouTube Video',
          content: `Title: ${sourceNode.data.videoData.title}\nDescription: ${sourceNode.data.videoData.description}\nTranscript: ${sourceNode.data.videoData.transcript}`,
          metadata: sourceNode.data.videoData
        };
      } else if (sourceNode.data.extractedText) {
        nodeData = {
          type: 'document',
          title: sourceNode.data.uploadedFile?.name || 'Document',
          content: sourceNode.data.extractedText,
          metadata: sourceNode.data.uploadedFile
        };
      } else if (sourceNode.data.generatedImage) {
        nodeData = {
          type: 'image',
          title: `Generated Image: ${sourceNode.data.prompt?.substring(0, 50) || 'Image'}`,
          content: `Generated image with prompt: ${sourceNode.data.prompt || 'No prompt'}`,
          metadata: sourceNode.data.generatedImage
        };
      }
      dataSource = 'legacy';
      console.log(`[Data Aggregation] Found legacy data structure for ${sourceNodeId}:`, nodeData);
    }

    if (nodeData && sourceNode) {
      const nodeType = sourceNode.type;
      console.log(`[Data Aggregation] Including data from ${nodeType} node (${sourceNodeId}) via ${dataSource}:`, nodeData);

      // Structure data by node type for better organization
      if (!connectedData[nodeType]) {
        connectedData[nodeType] = [];
      }
      connectedData[nodeType].push({
        nodeId: sourceNodeId,
        data: nodeData,
        label: sourceNode.data?.label || `${nodeType} node`,
        dataSource: dataSource
      });
    } else if (sourceNode) {
      console.log(`[Data Aggregation] Source node ${sourceNodeId} (${sourceNode.type}) has no accessible data`);
    }
  });

  return connectedData;
}

async function executeChatWithAnything(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Chat with Anything node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Chat with Anything Node with ID ${state.currentNodeId} not found`);

  const { systemPrompt, modelProvider, modelName, apiKey } = currentNode.data;

  // Get all connected input data
  const connectedInputData = getConnectedInputData(currentNode.id, state);
  const hasConnectedData = Object.keys(connectedInputData).length > 0;

  console.log(`[Chat Node ${currentNode.id}] Connected data available:`, hasConnectedData);
  console.log(`[Chat Node ${currentNode.id}] Connected data:`, connectedInputData);

  // If there's a chat input from the request, process it with the connected data
  if (state.chatInput) {
    console.log(`[Chat Node ${currentNode.id}] Processing chat input: "${state.chatInput}"`);

    // Prepare the message with all connected data as context
    let messageContent = state.chatInput;

    if (hasConnectedData) {
      // Create a comprehensive context from all connected nodes
      let contextSections = [];

      Object.entries(connectedInputData).forEach(([nodeType, nodeDataArray]: [string, any[]]) => {
        nodeDataArray.forEach((nodeInfo, index) => {
          contextSections.push(`=== ${nodeInfo.label} (${nodeType}) ===`);

          // Format data based on node type
          if (nodeType === 'youtube') {
            const data = nodeInfo.data;
            contextSections.push(`Title: ${data.title || 'N/A'}`);
            contextSections.push(`URL: ${data.url || 'N/A'}`);
            contextSections.push(`Duration: ${data.duration || 'N/A'}`);
            contextSections.push(`Views: ${data.views || 'N/A'}`);
            if (data.description) contextSections.push(`Description: ${data.description}`);
            if (data.transcript) contextSections.push(`Transcript: ${data.transcript}`);
          } else if (nodeType === 'urlScraper') {
            const data = nodeInfo.data;
            contextSections.push(`URL: ${data.url || 'N/A'}`);
            contextSections.push(`Title: ${data.title || 'N/A'}`);
            if (data.content) contextSections.push(`Content: ${data.content}`);
          } else if (nodeType === 'customInput') {
            const data = nodeInfo.data;
            contextSections.push(`Input: ${data.query || data.input || JSON.stringify(data)}`);
          } else {
            // Generic handling for other node types
            contextSections.push(`Data: ${JSON.stringify(nodeInfo.data, null, 2)}`);
          }
          contextSections.push(''); // Empty line for separation
        });
      });

      const contextData = contextSections.join('\n');
      messageContent = `CONNECTED DATA CONTEXT:\n${contextData}\n\nUSER REQUEST: ${state.chatInput}`;
    } else if (state.currentData) {
      // Fallback to current data if no connected data
      messageContent = `Context data:\n${JSON.stringify(state.currentData, null, 2)}\n\nUser request: ${state.chatInput}`;
    }

    // Process with the configured AI model
    if (modelProvider === 'orchestrator') {
      // Use orchestrator
      try {
        const response = await fetch('http://localhost:5001/api/orchestrator/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            context: {
              timestamp: new Date().toISOString(),
              frontend: 'agent-flow',
              system_prompt: systemPrompt || 'You are a helpful AI assistant.',
              node_id: currentNode.id,
              original_query: state.originalQuery,
              agent_mode: true
            },
            workspace: 'agent_flow_chat'
          })
        });

        if (response.ok) {
          const result = await response.json();
          const chatResponse = result.response || 'No response from orchestrator';

          const steps = [...state.steps, `Chat with Anything (${currentNode.id}): Processed chat input`];

          const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
          const nextNodeId = outgoingEdge?.target || null;

          // Store this node's output
          const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: chatResponse };
          const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

          return {
            currentData: chatResponse,
            steps,
            currentNodeId: nextNodeId,
            nodeOutputs: updatedNodeOutputs,
            processedNodes: updatedProcessedNodes
          };
        }
      } catch (error) {
        console.error('Orchestrator chat error:', error);
      }
    } else if (apiKey) {
      // Use configured AI provider
      try {
        let llm;
        if (modelProvider === 'openai') {
          llm = new ChatOpenAI({ apiKey, modelName: modelName || 'gpt-4o' });
        } else if (modelProvider === 'anthropic') {
          llm = new ChatAnthropic({ apiKey, modelName: modelName || 'claude-3-sonnet-20240229' });
        } else if (modelProvider === 'google') {
          llm = new ChatGoogleGenerativeAI({ apiKey, modelName: modelName || 'gemini-pro' });
        }

        if (llm) {
          const messages = [
            new SystemMessage(systemPrompt || 'You are a helpful AI assistant.'),
            new HumanMessage(messageContent)
          ];

          const response = await llm.invoke(messages);
          const chatResponse = response.content;

          const steps = [...state.steps, `Chat with Anything (${currentNode.id}): Processed chat input`];

          const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
          const nextNodeId = outgoingEdge?.target || null;

          // Store this node's output
          const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: chatResponse };
          const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

          return {
            currentData: chatResponse,
            steps,
            currentNodeId: nextNodeId,
            nodeOutputs: updatedNodeOutputs,
            processedNodes: updatedProcessedNodes
          };
        }
      } catch (error) {
        console.error('AI provider chat error:', error);
      }
    }
  }

  // If no chat input or processing failed, just pass data through
  const steps = [...state.steps, `Chat with Anything (${currentNode.id}): Data available for chat interaction`];

  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  return {
    currentData: state.currentData,
    steps,
    currentNodeId: nextNodeId
  };
}

async function executeDocumentUpload(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Document Upload node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Document Upload Node with ID ${state.currentNodeId} not found`);

  // Extract document data from the node
  const uploadedFile = currentNode.data.uploadedFile || {};
  const extractedText = currentNode.data.extractedText || '';
  const processedContent = currentNode.data.processedContent || {};

  const documentData = {
    fileName: uploadedFile.name || 'Unknown Document',
    fileType: uploadedFile.type || 'unknown',
    fileSize: uploadedFile.size || 0,
    content: extractedText || uploadedFile.content || '',
    processedContent: processedContent
  };

  const steps = [...state.steps, `Document Upload (${currentNode.id}): Processed document - ${documentData.fileName}`];

  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: documentData };
  const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

  return {
    currentData: documentData,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeImageGeneration(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Image Generation node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Image Generation Node with ID ${state.currentNodeId} not found`);

  // Extract image generation data from the node
  const generatedImage = currentNode.data.generatedImage || {};
  const processedContent = currentNode.data.processedContent || {};

  const imageData = {
    prompt: currentNode.data.prompt || '',
    provider: currentNode.data.provider || 'unknown',
    model: currentNode.data.model || 'unknown',
    imageUrl: generatedImage.url || '',
    timestamp: generatedImage.timestamp || Date.now(),
    processedContent: processedContent
  };

  const steps = [...state.steps, `Image Generation (${currentNode.id}): Generated image with prompt - ${imageData.prompt.substring(0, 50)}...`];

  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: imageData };
  const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

  return {
    currentData: imageData,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeImageToImage(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Image-to-Image node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Image-to-Image Node with ID ${state.currentNodeId} not found`);

  // Extract image transformation data from the node
  const sourceImage = currentNode.data.sourceImage || {};
  const generatedImage = currentNode.data.generatedImage || {};
  const processedContent = currentNode.data.processedContent || {};

  const transformData = {
    prompt: currentNode.data.prompt || '',
    provider: currentNode.data.provider || 'unknown',
    model: currentNode.data.model || 'unknown',
    sourceImageName: sourceImage.name || 'Unknown Source',
    transformedImageUrl: generatedImage.url || '',
    strength: currentNode.data.strength || 0.7,
    timestamp: generatedImage.timestamp || Date.now(),
    processedContent: processedContent
  };

  const steps = [...state.steps, `Image-to-Image (${currentNode.id}): Transformed ${transformData.sourceImageName} with prompt - ${transformData.prompt.substring(0, 50)}...`];

  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: transformData };
  const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

  return {
    currentData: transformData,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeMediaUpload(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Media Upload node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`Media Upload Node with ID ${state.currentNodeId} not found`);

  // Extract media upload data from the node
  const uploadedFile = currentNode.data.uploadedFile || {};
  const analysisResult = currentNode.data.analysisResult || {};
  const processedContent = currentNode.data.processedContent || {};

  const mediaData = {
    fileName: uploadedFile.name || 'Unknown Media',
    fileType: uploadedFile.type || 'unknown',
    fileSize: uploadedFile.size || 0,
    analysis: analysisResult,
    processedContent: processedContent
  };

  const steps = [...state.steps, `Media Upload (${currentNode.id}): Analyzed media file - ${mediaData.fileName}`];

  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: mediaData };
  const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

  return {
    currentData: mediaData,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeYouTube(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing YouTube node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`YouTube Node with ID ${state.currentNodeId} not found`);

  // Extract YouTube data from the node - access from videoData property
  const videoData = currentNode.data.videoData || {};
  const youtubeData = {
    title: videoData.title || currentNode.data.title || '',
    description: videoData.description || currentNode.data.description || '',
    transcript: videoData.transcript || currentNode.data.transcript || '',
    duration: videoData.duration || currentNode.data.duration || '',
    views: videoData.views || currentNode.data.views || '',
    channel: videoData.channel || currentNode.data.channel || '',
    url: currentNode.data.url || ''
  };

  const steps = [...state.steps, `YouTube (${currentNode.id}): Extracted video data - ${youtubeData.title}`];

  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: youtubeData };
  const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

  return {
    currentData: youtubeData,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeURLScraper(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing URL Scraper node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) throw new Error(`URL Scraper Node with ID ${state.currentNodeId} not found`);

  // Extract URL scraper data from the node
  const urlData = {
    title: currentNode.data.title || '',
    content: currentNode.data.content || '',
    url: currentNode.data.url || ''
  };

  const steps = [...state.steps, `URL Scraper (${currentNode.id}): Scraped content from ${urlData.url}`];

  const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
  const nextNodeId = outgoingEdge?.target || null;

  // Store this node's output
  const updatedNodeOutputs = { ...state.nodeOutputs, [currentNode.id]: urlData };
  const updatedProcessedNodes = new Set(state.processedNodes).add(currentNode.id);

  return {
    currentData: urlData,
    steps,
    currentNodeId: nextNodeId,
    nodeOutputs: updatedNodeOutputs,
    processedNodes: updatedProcessedNodes
  };
}

async function executeOutput(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing output node");

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  const steps = [...state.steps, `Output: ${typeof state.currentData === 'string' ? state.currentData.substring(0,100)+'...' : JSON.stringify(state.currentData)}`];

  return {
    steps,
    executionComplete: true,
    currentNodeId: null
  };
}

async function executeOrchestratorLLM(state: GraphStateType, currentNode: any): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Orchestrator LLM node");

  const { systemPrompt: nodeSystemPrompt } = currentNode.data;

  const contextSystemPrompt = `Final Goal: ${state.originalQuery}\n\nCurrent Status/Input: ${String(state.currentData)}`;
  const combinedSystemPrompt = `${contextSystemPrompt}\n\n${nodeSystemPrompt || ''}`.trim();

  try {
    // Call orchestrator API
    const response = await fetch('http://localhost:5001/api/orchestrator/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: String(state.currentData),
        context: {
          timestamp: new Date().toISOString(),
          frontend: 'agent-flow',
          system_prompt: combinedSystemPrompt,
          node_id: currentNode.id,
          original_query: state.originalQuery
        },
        workspace: 'agent_flow_llm'
      })
    });

    if (!response.ok) {
      throw new Error(`Orchestrator API failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Orchestrator error: ${result.error}`);
    }

    const steps = [...state.steps, `Result (Orchestrator LLM ${currentNode.id}): ${result.response.substring(0,100)}...`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: result.response,
      steps,
      currentNodeId: nextNodeId
    };

  } catch (error: any) {
    console.error(`[Orchestrator LLM ${currentNode.id}] Error:`, error);
    const steps = [...state.steps, `Error (Orchestrator LLM ${currentNode.id}): ${error.message}`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: `Error: ${error.message}`,
      steps,
      currentNodeId: nextNodeId
    };
  }
}

function routeNext(state: GraphStateType): string {
  if (state.executionComplete || !state.currentNodeId) {
    return END;
  }

  const currentNode = state.graphNodes.find(n => n.id === state.currentNodeId);
  if (!currentNode) {
    return END;
  }

  switch (currentNode.type) {
    case 'llm':
      return 'llm';
    case 'agent':
      return 'agent';
    case 'vectorStore':
      return 'vectorStore';
    case 'huggingFace':
      return 'huggingFace';
    case 'database':
      return 'database';
    case 'fileStorage':
      return 'fileStorage';
    case 'chatWithAnything':
      return 'chatWithAnything';
    case 'youtube':
      return 'youtube';
    case 'urlScraper':
      return 'urlScraper';
    case 'documentUpload':
      return 'documentUpload';
    case 'imageGeneration':
      return 'imageGeneration';
    case 'imageToImage':
      return 'imageToImage';
    case 'mediaUpload':
      return 'mediaUpload';
    case 'customOutput':
      return 'output';
    case 'composio':
      return 'agent';
    default:
      return END;
  }
}

async function executeGraphWithLangGraph(
  graphJson: { nodes: any[]; edges: any[] },
  chatInput: string | null = null
): Promise<{ response: string; steps: string[] }> {
  console.log("[LangGraph] Starting graph execution");

  const workflow = new StateGraph(GraphState)
    .addNode('input', executeInput)
    .addNode('llm', executeLLM)
    .addNode('agent', executeAgent)
    .addNode('vectorStore', executeVectorStore)
    .addNode('huggingFace', executeHuggingFace)
    .addNode('database', executeDatabase)
    .addNode('fileStorage', executeFileStorage)
    .addNode('chatWithAnything', executeChatWithAnything)
    .addNode('youtube', executeYouTube)
    .addNode('urlScraper', executeURLScraper)
    .addNode('documentUpload', executeDocumentUpload)
    .addNode('imageGeneration', executeImageGeneration)
    .addNode('imageToImage', executeImageToImage)
    .addNode('mediaUpload', executeMediaUpload)
    .addNode('output', executeOutput)
    .addEdge(START, 'input')
    .addConditionalEdges('input', routeNext)
    .addConditionalEdges('llm', routeNext)
    .addConditionalEdges('agent', routeNext)
    .addConditionalEdges('vectorStore', routeNext)
    .addConditionalEdges('huggingFace', routeNext)
    .addConditionalEdges('database', routeNext)
    .addConditionalEdges('fileStorage', routeNext)
    .addConditionalEdges('chatWithAnything', routeNext)
    .addConditionalEdges('youtube', routeNext)
    .addConditionalEdges('urlScraper', routeNext)
    .addConditionalEdges('documentUpload', routeNext)
    .addConditionalEdges('imageGeneration', routeNext)
    .addConditionalEdges('imageToImage', routeNext)
    .addConditionalEdges('mediaUpload', routeNext)
    .addEdge('output', END);

  const app = workflow.compile();

  const initialState: GraphStateType = {
    currentData: null,
    originalQuery: '',
    graphNodes: graphJson.nodes,
    graphEdges: graphJson.edges,
    steps: [],
    currentNodeId: null,
    executionComplete: false,
    chatInput: chatInput, // Pass the chat input from request
    nodeOutputs: {}, // Initialize empty node outputs storage
    processedNodes: new Set() // Initialize empty processed nodes set
  };

  const result = await app.invoke(initialState);
  
  return {
    response: String(result.currentData),
    steps: result.steps
  };
}

async function executeOrchestratorAgent(state: GraphStateType, currentNode: any): Promise<Partial<GraphStateType>> {
  console.log("[LangGraph] Executing Orchestrator Agent node");

  const { systemPrompt: nodeSystemPrompt, tools: nodeTools } = currentNode.data;

  const contextSystemPrompt = `Final Goal: ${state.originalQuery}\n\nCurrent Status/Input: ${String(state.currentData)}`;
  const combinedSystemPrompt = `${contextSystemPrompt}\n\n${nodeSystemPrompt || ''}`.trim();

  try {
    // Call orchestrator API with agent context
    const response = await fetch('http://localhost:5001/api/orchestrator/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: String(state.currentData),
        context: {
          timestamp: new Date().toISOString(),
          frontend: 'agent-flow',
          system_prompt: combinedSystemPrompt,
          node_id: currentNode.id,
          original_query: state.originalQuery,
          tools: nodeTools || [],
          agent_mode: true
        },
        workspace: 'agent_flow_agent'
      })
    });

    if (!response.ok) {
      throw new Error(`Orchestrator API failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Orchestrator error: ${result.error}`);
    }

    const steps = [...state.steps, `Result (Orchestrator Agent ${currentNode.id}): ${result.response.substring(0,100)}...`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: result.response,
      steps,
      currentNodeId: nextNodeId
    };

  } catch (error: any) {
    console.error(`[Orchestrator Agent ${currentNode.id}] Error:`, error);
    const steps = [...state.steps, `Error (Orchestrator Agent ${currentNode.id}): ${error.message}`];

    const outgoingEdge = state.graphEdges.find(edge => edge.source === currentNode.id);
    const nextNodeId = outgoingEdge?.target || null;

    return {
      currentData: `Error: ${error.message}`,
      steps,
      currentNodeId: nextNodeId
    };
  }
}

export async function POST(request: NextRequest) {
  console.log("Received POST request to /api/agent");
  try {
    const rawBody = await request.json();
    console.log("Raw request body:", rawBody);

    const validationResult = AgentRequestBodySchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error("Invalid request body:", validationResult.error.format());
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { graphJson, chatInput } = validationResult.data;
    console.log("Parsed graph JSON:", graphJson);
    console.log("Chat input:", chatInput);

    const result = await executeGraphWithLangGraph(graphJson, chatInput);

    console.log("Agent execution result:", result);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error running agent:", error);
    if (error.message.includes("requires an apiKey") || error.message.includes("requires an llmApiKey") || error.message.includes("'customInput' node")) {
      return NextResponse.json({ error: `Configuration Error: ${error.message}` }, { status: 400 });
    }
    if (error.response?.status === 401 || error.message.includes("Incorrect API key")) {
      return NextResponse.json({ error: `Authentication Error: ${error.message}` }, { status: 401 });
    }
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
} 