import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Composio } from "@composio/core";

// New orchestrator-based generation function
async function handleOrchestratorGeneration(useCase: string) {
    try {
        // First check if orchestrator is healthy
        console.log('🔍 Checking orchestrator health...');
        const healthResponse = await fetch('http://127.0.0.1:8000/api/orchestrator/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!healthResponse.ok) {
            console.error('❌ Orchestrator health check failed:', healthResponse.status);
            return NextResponse.json({
                error: 'Orchestrator service is not available',
                details: `Health check failed with status ${healthResponse.status}`
            }, { status: 503 });
        }

        const healthData = await healthResponse.json();
        console.log('✅ Orchestrator health:', healthData);

        // Call Metatron Orchestrator to generate the agent flow
        console.log('🤖 Calling orchestrator to generate agent flow...');
        const orchestratorResponse = await fetch('http://127.0.0.1:8000/api/orchestrator/generate-agent-flow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                useCase: useCase,
                context: {
                    timestamp: new Date().toISOString(),
                    frontend: 'agent-flow-builder',
                    system_prompt: 'Generate a complete agent workflow based on the user description'
                }
            })
        });

        if (!orchestratorResponse.ok) {
            const errorText = await orchestratorResponse.text();
            console.error('❌ Orchestrator generation failed:', orchestratorResponse.status, errorText);
            return NextResponse.json({
                error: 'Orchestrator generation failed',
                details: `Status ${orchestratorResponse.status}: ${errorText}`
            }, { status: 500 });
        }

        const result = await orchestratorResponse.json();
        console.log('📊 Orchestrator response:', result);

        if (result.success && result.graph) {
            console.log('✅ Agent flow generated successfully');
            return NextResponse.json(result.graph);
        } else {
            console.error('❌ Agent flow generation failed:', result.error);
            return NextResponse.json({
                error: 'Failed to generate agent flow',
                details: result.error || 'Unknown error'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Orchestrator generation error:', error);
        return NextResponse.json({
            error: 'Internal server error during generation',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

function getModelDetails(apiKey: string): { provider: string; modelName: string; chatModel: any } {
    if (apiKey.startsWith("sk-ant-")) {
        return {
            provider: "anthropic",
            modelName: "claude-3-5-sonnet-20240620",
            chatModel: new ChatAnthropic({
                apiKey: apiKey,
                model: "claude-3-5-sonnet-20240620",
                temperature: 0.3,
            }),
        };
    } else if (apiKey.startsWith("sk-")) {
        return {
            provider: "openai",
            modelName: "gpt-4o",
            chatModel: new ChatOpenAI({
                apiKey: apiKey,
                model: "gpt-4o",
                temperature: 0.3,
            }),
        };
    } else {
        return {
            provider: "google",
            modelName: "gemini-2.0-flash",
            chatModel: new ChatGoogleGenerativeAI({
                apiKey: apiKey,
                model: "gemini-2.0-flash",
                temperature: 0.3,
            }),
        };
    }
}

function constructSystemPrompt(
    llmApiKey: string,
    composioApiKey: string,
    llmProvider: string,
    llmModelName: string,
    tools: any[]
): string {
    return `
You are an expert AI assistant that generates graph structures for a workflow automation platform.
Your task is to create a JSON object representing a graph of nodes and edges based on the user's description of an agent or workflow. The graph will be used to render a diagram in a ReactFlow canvas.

**Instructions:**
- The generated graph must always include an input node (type 'customInput') and an output node (type 'customOutput'), regardless of the workflow.
- Decompose the user's workflow description into meaningful, actionable steps. Do not just create a literal input node for the user query. For example, if the user says "google meet transcript to slack message", generate a graph with steps like "fetch transcript from Google Meet" and "send message to Slack general channel" as agent nodes.
- Use the 'customInput' node only for genuine user input that is required at the start of the workflow (e.g., a prompt, a file, or a value the user must provide). Do not use it as a placeholder for the entire workflow description.
- For any step that requires LLM or tool/action usage, always use the 'agent' node. Do not use 'llm' or 'composio' nodes separately. All LLM/tool steps must be represented as 'agent' nodes only.
- For any agent node that needs to use actions, include a field called 'allowedTools' in its data, which is a single comma-separated string of the action names from the 'actions' array of the relevant app(s) below. For example: 'allowedTools': 'ACTION_1,ACTION_2'.
- Do not invent actions; always use the provided actions.

**Available Tools and Actions:**
${tools.map(t => `- App: ${t.app}\n  Actions: ${t.actions.join(', ')}\n  Description: ${t.description || ''}`).join('\n')}

**Workflow Patterns:**
You can generate a variety of agentic workflow patterns, not just simple input-agent-output. Some common patterns include:
- **Prompt Chaining:** Sequential steps where the output of one agent is used as input for the next.
- **Parallelisation:** Multiple agents or actions run in parallel, then their results are aggregated.
- **Routing:** A router agent decides which branch or agent to send the input to, based on logic or input.
- **Evaluator-Optimiser:** A generator agent produces solutions, an evaluator agent checks them, and the process loops until a good solution is found.
- **Augmented LLM:** An agent node is augmented with tool calls or external data fetching.

Choose the most appropriate pattern for the user's use case. If the user specifies a pattern, follow it. If not, select the best fit based on the use case. If the use case is ambiguous, you may ask the user for clarification or suggest a pattern.

**Node Types and Data:**
1. 'customInput': Starting point for genuine user input (not a placeholder for the workflow).
   - data: { label: string, query: string }
2. 'agent': Autonomous agent with LLM and tool access.
   - data: { label: string, systemPrompt: string, llmApiKey: "${llmApiKey}", modelProvider: "${llmProvider}", modelName: "${llmModelName}", composioApiKey: "${composioApiKey}", allowedTools: "ACTION_1,ACTION_2" }
3. 'customOutput': End point.
   - data: { label: string }

**Node Structure:**
Each node: { "id": string, "type": string, "position": { "x": number, "y": number }, "data": { ... } }

**Edge Structure:**
Each edge: { "id": string, "source": string, "target": string }

**Workflow Logic:**
- Start with a 'customInput' node only if genuine user input is needed, then proceed to agent nodes for each actionable step.
- Use 'agent' nodes for all steps that require LLM or tool/action usage. Do not use 'llm' or 'composio' nodes.
- Generate clear, descriptive labels (use user-provided names if available).
- Use only the tools/actions you have access to from the provided list.
- You may use branching, parallel, or looping structures as needed to fit the pattern.

Node IDs: Use a simple scheme like "input_1", "agent_1", "output_1".

Your output MUST be a single valid JSON object with "nodes" and "edges" arrays. Do not include any other text or explanations outside the JSON structure.
Keep the graph simple and logical. Usually 2-5 nodes are sufficient unless the workflow is complex.
`;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { useCase, useOrchestrator, usePydanticAI } = body;

        // If using PydanticAI orchestrator or legacy orchestrator, delegate to Metatron's backend
        if (useOrchestrator || usePydanticAI) {
            return await handleOrchestratorGeneration(useCase);
        }

        // Legacy path for direct API key usage (kept for backward compatibility)
        const { llmApiKey, composioApiKey } = body;
        if (!llmApiKey || !composioApiKey) {
            return NextResponse.json({
                error: 'Missing API keys. Please use the new orchestrator mode or provide API keys.'
            }, { status: 400 });
        }

        const modelDetails = getModelDetails(llmApiKey);
        const { provider, modelName, chatModel } = modelDetails;
        let usecaseResponse;
        try {
            usecaseResponse = await chatModel.invoke(`This is the use case the user wants to build an agent for: ${useCase}. Please generate a small, simple usecase string that describes the core action needed, if it involves multiple steps mention the name of the app and the step.`);
        } catch (e: any) {
            return NextResponse.json({ error: 'Error during LLM invoke', details: e?.message || e }, { status: 500 });
        }

        // Use structured output to get a list of app names (JSON Schema)
        const schema = {
            type: "object",
            properties: {
                apps: {
                    type: "array",
                    items: { type: "string", description: "A lowercase app name mentioned in the user input" }
                }
            },
            required: ["apps"]
        };
        const modelWithStructure = chatModel.withStructuredOutput(schema);
        const structuredOutput = await modelWithStructure.invoke(
            `Extract a list of app names (as lowercase strings) mentioned in the following use case. Respond as { "apps": [ ... ] } and nothing else. Usecase: ${useCase}`
        );
        let apps = Array.isArray(structuredOutput.apps) ? structuredOutput.apps : [];
        if (!apps.length) {
            return NextResponse.json({ error: 'No apps found in user input.' }, { status: 400 });
        }

        // Fetch tools from API
        const toolResponse = await fetch('https://find-actions.composio.dev/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                use_case: usecaseResponse.content, 
                min_actions_per_task: 0,
                max_actions_per_task: 0,
                limit: 0
            })
        });
        let tools;
        try {
            tools = await toolResponse.json();
        } catch (e) {
            return NextResponse.json({ error: 'Failed to parse tools API response.' }, { status: 500 });
        }
        if (!toolResponse.ok || !tools || !Array.isArray(tools) || tools.length === 0) {
            return NextResponse.json({ error: 'No tools found for the use case or tools API returned an error.', details: tools }, { status: 500 });
        }

        // Pass tools to the system prompt
        const systemPrompt = constructSystemPrompt(
            llmApiKey,
            composioApiKey,
            provider,
            modelName,
            tools
        );

        // LLM call to generate the graph
        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(`Generate a graph for the following agent/workflow: ${useCase}`),
        ];
        const response = await chatModel.invoke(messages);

        // Extract and parse the graph JSON from the LLM response
        let graphJsonString = "";
        if (typeof response.content === "string" && response.content.trim()) {
            graphJsonString = response.content.trim();
        }
        // Robustly extract JSON from code blocks like ```json graph ...```
        const codeBlockRegex = /```json[^\n]*\n([\s\S]*?)\n```/i;
        const jsonMatch = graphJsonString.match(codeBlockRegex);
        if (jsonMatch && jsonMatch[1]) {
            graphJsonString = jsonMatch[1];
        }
        graphJsonString = typeof graphJsonString === 'string' ? graphJsonString.trim() : '';

        let graph;
        try {
            graph = JSON.parse(graphJsonString);
        } catch (e: any) {
            return NextResponse.json({ error: "Failed to parse LLM response as JSON.", llmOutput: graphJsonString }, { status: 500 });
        }

        if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
            return NextResponse.json({ error: "LLM returned invalid graph structure (missing nodes or edges array).", llmOutput: graph }, { status: 500 });
        }
        return NextResponse.json(graph);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}