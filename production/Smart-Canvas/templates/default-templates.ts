/**
 * Default Templates for Metatron Agent Flow
 * 
 * This file contains pre-built workflow templates ranging from basic to advanced.
 * Templates are automatically loaded when the application starts.
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  created: string;
  category: 'Saved';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  estimatedTime: string;
  useCase: string;
}

// Helper function to generate unique IDs
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const defaultTemplates: WorkflowTemplate[] = [
  // ===== BEGINNER TEMPLATES =====
  {
    id: 'template_basic_chat',
    name: 'Basic AI Chat',
    description: 'Simple chat interface with AI response',
    difficulty: 'Beginner',
    tags: ['chat', 'basic', 'ai'],
    estimatedTime: '2 minutes',
    useCase: 'Quick AI conversations and questions',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 100 },
        data: {
          label: 'User Input',
          query: 'Hello, how can you help me today?',
          chatMode: true
        }
      },
      {
        id: 'llm_1',
        type: 'llm',
        position: { x: 400, y: 100 },
        data: {
          label: 'AI Assistant',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a helpful AI assistant. Provide clear, concise, and friendly responses.',
          temperature: 0.7,
          maxTokens: 500
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 700, y: 100 },
        data: {
          label: 'AI Response'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'input_1',
        target: 'llm_1',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'llm_1',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  {
    id: 'template_youtube_summary',
    name: 'YouTube Video Summarizer',
    description: 'Extract and summarize YouTube video content',
    difficulty: 'Beginner',
    tags: ['youtube', 'summary', 'content'],
    estimatedTime: '3 minutes',
    useCase: 'Quickly understand video content without watching',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'youtube_1',
        type: 'youtube',
        position: { x: 100, y: 100 },
        data: {
          label: 'YouTube Video',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        }
      },
      {
        id: 'llm_1',
        type: 'llm',
        position: { x: 400, y: 100 },
        data: {
          label: 'Summarizer',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Summarize the provided video content in 3-5 key points. Focus on the main ideas and actionable insights.',
          temperature: 0.3,
          maxTokens: 300
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 700, y: 100 },
        data: {
          label: 'Video Summary'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'youtube_1',
        target: 'llm_1',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'llm_1',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  {
    id: 'template_document_qa',
    name: 'Document Q&A',
    description: 'Upload a document and ask questions about it',
    difficulty: 'Beginner',
    tags: ['document', 'qa', 'analysis'],
    estimatedTime: '3 minutes',
    useCase: 'Extract insights and answer questions from documents',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'doc_1',
        type: 'documentUpload',
        position: { x: 100, y: 100 },
        data: {
          label: 'Document Upload'
        }
      },
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 300 },
        data: {
          label: 'Your Question',
          query: 'What are the main points in this document?'
        }
      },
      {
        id: 'llm_1',
        type: 'llm',
        position: { x: 400, y: 200 },
        data: {
          label: 'Document Analyzer',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a document analysis expert. Answer questions about the provided document content accurately and comprehensively.',
          temperature: 0.2,
          maxTokens: 600
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 700, y: 200 },
        data: {
          label: 'Answer'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'doc_1',
        target: 'llm_1',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'input_1',
        target: 'llm_1',
        type: 'default'
      },
      {
        id: 'e3',
        source: 'llm_1',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  // ===== INTERMEDIATE TEMPLATES =====
  {
    id: 'template_content_pipeline',
    name: 'Content Creation Pipeline',
    description: 'Multi-step content creation with research, writing, and editing',
    difficulty: 'Intermediate',
    tags: ['content', 'writing', 'pipeline'],
    estimatedTime: '5 minutes',
    useCase: 'Create high-quality content with research and editing',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 200 },
        data: {
          label: 'Topic Input',
          query: 'The future of artificial intelligence in healthcare'
        }
      },
      {
        id: 'llm_1',
        type: 'llm',
        position: { x: 300, y: 100 },
        data: {
          label: 'Researcher',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a research expert. Provide comprehensive research points, key facts, and current trends about the given topic. Focus on accuracy and recent developments.',
          temperature: 0.3,
          maxTokens: 800
        }
      },
      {
        id: 'llm_2',
        type: 'llm',
        position: { x: 500, y: 200 },
        data: {
          label: 'Writer',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a professional content writer. Create engaging, well-structured content based on the research provided. Use clear headings, compelling introduction, and actionable insights.',
          temperature: 0.7,
          maxTokens: 1200
        }
      },
      {
        id: 'llm_3',
        type: 'llm',
        position: { x: 700, y: 300 },
        data: {
          label: 'Editor',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a professional editor. Review and improve the content for clarity, flow, grammar, and engagement. Maintain the original message while enhancing readability.',
          temperature: 0.4,
          maxTokens: 1200
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 900, y: 200 },
        data: {
          label: 'Final Content'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'input_1',
        target: 'llm_1',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'input_1',
        target: 'llm_2',
        type: 'default'
      },
      {
        id: 'e3',
        source: 'llm_1',
        target: 'llm_2',
        type: 'default'
      },
      {
        id: 'e4',
        source: 'llm_2',
        target: 'llm_3',
        type: 'default'
      },
      {
        id: 'e5',
        source: 'llm_3',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  // ===== ADVANCED TEMPLATES =====
  {
    id: 'template_multi_agent_research',
    name: 'Multi-Agent Research System',
    description: 'Coordinated agents for comprehensive research and analysis',
    difficulty: 'Advanced',
    tags: ['multi-agent', 'research', 'coordination'],
    estimatedTime: '8 minutes',
    useCase: 'Deep research with multiple specialized AI agents',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 300 },
        data: {
          label: 'Research Topic',
          query: 'Impact of quantum computing on cybersecurity'
        }
      },
      {
        id: 'agent_1',
        type: 'agent',
        position: { x: 300, y: 150 },
        data: {
          label: 'Technical Researcher',
          modelProvider: 'orchestrator',
          systemPrompt: 'You are a technical research specialist. Focus on technical aspects, current developments, and scientific papers.',
          agentType: 'researcher',
          tools: ['web_search', 'academic_search']
        }
      },
      {
        id: 'agent_2',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Market Analyst',
          modelProvider: 'orchestrator',
          systemPrompt: 'You are a market analysis expert. Focus on business implications, market trends, and economic impact.',
          agentType: 'analyst',
          tools: ['web_search', 'market_data']
        }
      },
      {
        id: 'agent_3',
        type: 'agent',
        position: { x: 300, y: 450 },
        data: {
          label: 'Risk Assessor',
          modelProvider: 'orchestrator',
          systemPrompt: 'You are a risk assessment specialist. Focus on potential risks, challenges, and mitigation strategies.',
          agentType: 'risk_assessor',
          tools: ['web_search', 'risk_analysis']
        }
      },
      {
        id: 'coordinator_1',
        type: 'coordinator',
        position: { x: 500, y: 300 },
        data: {
          label: 'Research Coordinator',
          modelProvider: 'coordinator',
          systemPrompt: 'Coordinate the research agents and synthesize their findings into a comprehensive report.',
          agentName: 'Research Coordinator',
          agentDescription: 'Coordinates multiple research agents for comprehensive analysis'
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 700, y: 300 },
        data: {
          label: 'Comprehensive Report'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'input_1',
        target: 'agent_1',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'input_1',
        target: 'agent_2',
        type: 'default'
      },
      {
        id: 'e3',
        source: 'input_1',
        target: 'agent_3',
        type: 'default'
      },
      {
        id: 'e4',
        source: 'agent_1',
        target: 'coordinator_1',
        type: 'default'
      },
      {
        id: 'e5',
        source: 'agent_2',
        target: 'coordinator_1',
        type: 'default'
      },
      {
        id: 'e6',
        source: 'agent_3',
        target: 'coordinator_1',
        type: 'default'
      },
      {
        id: 'e7',
        source: 'coordinator_1',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  // ===== WORKFLOW PATTERN IMPLEMENTATIONS =====

  // PROMPT CHAINING PATTERN
  {
    id: 'template_prompt_chaining',
    name: 'Prompt Chaining: Story Development',
    description: 'Sequential prompt chaining for creative story development',
    difficulty: 'Intermediate',
    tags: ['prompt-chaining', 'creative', 'sequential'],
    estimatedTime: '6 minutes',
    useCase: 'Develop complex narratives through sequential AI interactions',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 200 },
        data: {
          label: 'Story Concept',
          query: 'A detective in a cyberpunk city discovers a conspiracy'
        }
      },
      {
        id: 'llm_1',
        type: 'llm',
        position: { x: 300, y: 200 },
        data: {
          label: 'Character Creator',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Create detailed character profiles including background, motivations, and personality traits. Focus on making characters compelling and three-dimensional.',
          temperature: 0.8,
          maxTokens: 600
        }
      },
      {
        id: 'llm_2',
        type: 'llm',
        position: { x: 500, y: 200 },
        data: {
          label: 'Plot Developer',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Develop a compelling plot structure with clear acts, conflicts, and resolution. Build on the characters provided.',
          temperature: 0.7,
          maxTokens: 800
        }
      },
      {
        id: 'llm_3',
        type: 'llm',
        position: { x: 700, y: 200 },
        data: {
          label: 'Scene Writer',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Write vivid, engaging scenes based on the plot and characters. Focus on dialogue, action, and atmosphere.',
          temperature: 0.9,
          maxTokens: 1000
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 900, y: 200 },
        data: {
          label: 'Complete Story'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'input_1',
        target: 'llm_1',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'llm_1',
        target: 'llm_2',
        type: 'default'
      },
      {
        id: 'e3',
        source: 'llm_2',
        target: 'llm_3',
        type: 'default'
      },
      {
        id: 'e4',
        source: 'llm_3',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  // ROUTING PATTERN
  {
    id: 'template_routing_pattern',
    name: 'Routing: Customer Support Triage',
    description: 'Route customer queries to specialized support agents',
    difficulty: 'Intermediate',
    tags: ['routing', 'customer-support', 'triage'],
    estimatedTime: '5 minutes',
    useCase: 'Automatically route customer queries to appropriate specialists',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 300 },
        data: {
          label: 'Customer Query',
          query: 'I need help with billing and my account was charged twice'
        }
      },
      {
        id: 'llm_router',
        type: 'llm',
        position: { x: 300, y: 300 },
        data: {
          label: 'Query Router',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Analyze the customer query and categorize it as: TECHNICAL, BILLING, GENERAL, or URGENT. Respond with only the category name.',
          temperature: 0.1,
          maxTokens: 50
        }
      },
      {
        id: 'llm_technical',
        type: 'llm',
        position: { x: 500, y: 150 },
        data: {
          label: 'Technical Support',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a technical support specialist. Provide detailed technical solutions and troubleshooting steps.',
          temperature: 0.3,
          maxTokens: 800
        }
      },
      {
        id: 'llm_billing',
        type: 'llm',
        position: { x: 500, y: 300 },
        data: {
          label: 'Billing Support',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a billing specialist. Help with payment issues, refunds, and account billing questions.',
          temperature: 0.2,
          maxTokens: 600
        }
      },
      {
        id: 'llm_general',
        type: 'llm',
        position: { x: 500, y: 450 },
        data: {
          label: 'General Support',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a general customer service representative. Provide helpful, friendly assistance for general inquiries.',
          temperature: 0.5,
          maxTokens: 500
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 700, y: 300 },
        data: {
          label: 'Support Response'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'input_1',
        target: 'llm_router',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'llm_router',
        target: 'llm_technical',
        type: 'default'
      },
      {
        id: 'e3',
        source: 'llm_router',
        target: 'llm_billing',
        type: 'default'
      },
      {
        id: 'e4',
        source: 'llm_router',
        target: 'llm_general',
        type: 'default'
      },
      {
        id: 'e5',
        source: 'llm_technical',
        target: 'output_1',
        type: 'default'
      },
      {
        id: 'e6',
        source: 'llm_billing',
        target: 'output_1',
        type: 'default'
      },
      {
        id: 'e7',
        source: 'llm_general',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  // PARALLELISATION PATTERN
  {
    id: 'template_parallelisation_pattern',
    name: 'Parallelisation: Multi-Perspective Analysis',
    description: 'Analyze content from multiple perspectives simultaneously',
    difficulty: 'Advanced',
    tags: ['parallelisation', 'analysis', 'multi-perspective'],
    estimatedTime: '7 minutes',
    useCase: 'Get comprehensive analysis from different expert viewpoints',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 300 },
        data: {
          label: 'Content to Analyze',
          query: 'The rise of remote work and its impact on corporate culture'
        }
      },
      {
        id: 'llm_business',
        type: 'llm',
        position: { x: 350, y: 150 },
        data: {
          label: 'Business Analyst',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Analyze from a business perspective: productivity, costs, revenue impact, and strategic implications.',
          temperature: 0.4,
          maxTokens: 600
        }
      },
      {
        id: 'llm_hr',
        type: 'llm',
        position: { x: 350, y: 300 },
        data: {
          label: 'HR Specialist',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Analyze from an HR perspective: employee satisfaction, retention, recruitment, and team dynamics.',
          temperature: 0.4,
          maxTokens: 600
        }
      },
      {
        id: 'llm_tech',
        type: 'llm',
        position: { x: 350, y: 450 },
        data: {
          label: 'Technology Expert',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Analyze from a technology perspective: infrastructure, security, tools, and digital transformation.',
          temperature: 0.4,
          maxTokens: 600
        }
      },
      {
        id: 'llm_synthesizer',
        type: 'llm',
        position: { x: 600, y: 300 },
        data: {
          label: 'Synthesis Expert',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Synthesize the different perspectives into a comprehensive analysis. Identify common themes, conflicts, and actionable insights.',
          temperature: 0.5,
          maxTokens: 1000
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 800, y: 300 },
        data: {
          label: 'Comprehensive Analysis'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'input_1',
        target: 'llm_business',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'input_1',
        target: 'llm_hr',
        type: 'default'
      },
      {
        id: 'e3',
        source: 'input_1',
        target: 'llm_tech',
        type: 'default'
      },
      {
        id: 'e4',
        source: 'llm_business',
        target: 'llm_synthesizer',
        type: 'default'
      },
      {
        id: 'e5',
        source: 'llm_hr',
        target: 'llm_synthesizer',
        type: 'default'
      },
      {
        id: 'e6',
        source: 'llm_tech',
        target: 'llm_synthesizer',
        type: 'default'
      },
      {
        id: 'e7',
        source: 'llm_synthesizer',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  // EVALUATOR PATTERN
  {
    id: 'template_evaluator_pattern',
    name: 'Evaluator: Content Quality Assessment',
    description: 'Generate content and evaluate it through multiple quality criteria',
    difficulty: 'Advanced',
    tags: ['evaluator', 'quality-assessment', 'optimization'],
    estimatedTime: '8 minutes',
    useCase: 'Create high-quality content with automated evaluation and improvement',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 300 },
        data: {
          label: 'Content Brief',
          query: 'Write a blog post about sustainable energy solutions for small businesses'
        }
      },
      {
        id: 'llm_generator',
        type: 'llm',
        position: { x: 300, y: 300 },
        data: {
          label: 'Content Generator',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Generate high-quality content based on the brief. Focus on accuracy, engagement, and practical value.',
          temperature: 0.7,
          maxTokens: 1200
        }
      },
      {
        id: 'llm_accuracy',
        type: 'llm',
        position: { x: 500, y: 150 },
        data: {
          label: 'Accuracy Evaluator',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Evaluate the content for factual accuracy, credibility, and technical correctness. Rate 1-10 and provide specific feedback.',
          temperature: 0.2,
          maxTokens: 400
        }
      },
      {
        id: 'llm_engagement',
        type: 'llm',
        position: { x: 500, y: 300 },
        data: {
          label: 'Engagement Evaluator',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Evaluate the content for engagement, readability, and audience appeal. Rate 1-10 and provide specific feedback.',
          temperature: 0.3,
          maxTokens: 400
        }
      },
      {
        id: 'llm_seo',
        type: 'llm',
        position: { x: 500, y: 450 },
        data: {
          label: 'SEO Evaluator',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Evaluate the content for SEO optimization, keyword usage, and search visibility. Rate 1-10 and provide specific feedback.',
          temperature: 0.2,
          maxTokens: 400
        }
      },
      {
        id: 'llm_optimizer',
        type: 'llm',
        position: { x: 700, y: 300 },
        data: {
          label: 'Content Optimizer',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Based on all evaluations, improve the content to address identified issues while maintaining quality. Provide the optimized version.',
          temperature: 0.5,
          maxTokens: 1500
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 900, y: 300 },
        data: {
          label: 'Optimized Content'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'input_1',
        target: 'llm_generator',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'llm_generator',
        target: 'llm_accuracy',
        type: 'default'
      },
      {
        id: 'e3',
        source: 'llm_generator',
        target: 'llm_engagement',
        type: 'default'
      },
      {
        id: 'e4',
        source: 'llm_generator',
        target: 'llm_seo',
        type: 'default'
      },
      {
        id: 'e5',
        source: 'llm_generator',
        target: 'llm_optimizer',
        type: 'default'
      },
      {
        id: 'e6',
        source: 'llm_accuracy',
        target: 'llm_optimizer',
        type: 'default'
      },
      {
        id: 'e7',
        source: 'llm_engagement',
        target: 'llm_optimizer',
        type: 'default'
      },
      {
        id: 'e8',
        source: 'llm_seo',
        target: 'llm_optimizer',
        type: 'default'
      },
      {
        id: 'e9',
        source: 'llm_optimizer',
        target: 'output_1',
        type: 'default'
      }
    ]
  },

  // BONUS: COMPREHENSIVE WORKFLOW
  {
    id: 'template_comprehensive_workflow',
    name: 'Comprehensive: AI-Powered Research & Content Creation',
    description: 'Complete workflow combining research, analysis, creation, and optimization',
    difficulty: 'Advanced',
    tags: ['comprehensive', 'research', 'content', 'optimization'],
    estimatedTime: '12 minutes',
    useCase: 'End-to-end content creation with research, multiple perspectives, and quality assurance',
    category: 'Saved',
    created: new Date().toISOString(),
    nodes: [
      {
        id: 'input_1',
        type: 'customInput',
        position: { x: 100, y: 400 },
        data: {
          label: 'Project Brief',
          query: 'Create a comprehensive guide on implementing AI in small businesses'
        }
      },
      {
        id: 'url_1',
        type: 'urlScraper',
        position: { x: 100, y: 200 },
        data: {
          label: 'Research Source',
          url: 'https://example.com/ai-business-trends'
        }
      },
      {
        id: 'youtube_1',
        type: 'youtube',
        position: { x: 100, y: 600 },
        data: {
          label: 'Video Research',
          url: 'https://www.youtube.com/watch?v=example'
        }
      },
      {
        id: 'llm_researcher',
        type: 'llm',
        position: { x: 350, y: 300 },
        data: {
          label: 'Research Synthesizer',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Synthesize research from multiple sources into key insights and actionable information.',
          temperature: 0.3,
          maxTokens: 1000
        }
      },
      {
        id: 'llm_business',
        type: 'llm',
        position: { x: 550, y: 200 },
        data: {
          label: 'Business Perspective',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Analyze from a business strategy perspective: ROI, implementation costs, competitive advantages.',
          temperature: 0.4,
          maxTokens: 800
        }
      },
      {
        id: 'llm_technical',
        type: 'llm',
        position: { x: 550, y: 400 },
        data: {
          label: 'Technical Perspective',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Analyze from a technical perspective: implementation requirements, tools, infrastructure.',
          temperature: 0.4,
          maxTokens: 800
        }
      },
      {
        id: 'llm_writer',
        type: 'llm',
        position: { x: 750, y: 300 },
        data: {
          label: 'Content Creator',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Create comprehensive, well-structured content combining all perspectives and research.',
          temperature: 0.6,
          maxTokens: 2000
        }
      },
      {
        id: 'llm_evaluator',
        type: 'llm',
        position: { x: 950, y: 300 },
        data: {
          label: 'Quality Evaluator',
          modelProvider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'Evaluate content quality, completeness, and practical value. Suggest improvements.',
          temperature: 0.2,
          maxTokens: 600
        }
      },
      {
        id: 'output_1',
        type: 'customOutput',
        position: { x: 1150, y: 300 },
        data: {
          label: 'Final Guide'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'input_1',
        target: 'llm_researcher',
        type: 'default'
      },
      {
        id: 'e2',
        source: 'url_1',
        target: 'llm_researcher',
        type: 'default'
      },
      {
        id: 'e3',
        source: 'youtube_1',
        target: 'llm_researcher',
        type: 'default'
      },
      {
        id: 'e4',
        source: 'llm_researcher',
        target: 'llm_business',
        type: 'default'
      },
      {
        id: 'e5',
        source: 'llm_researcher',
        target: 'llm_technical',
        type: 'default'
      },
      {
        id: 'e6',
        source: 'llm_business',
        target: 'llm_writer',
        type: 'default'
      },
      {
        id: 'e7',
        source: 'llm_technical',
        target: 'llm_writer',
        type: 'default'
      },
      {
        id: 'e8',
        source: 'llm_writer',
        target: 'llm_evaluator',
        type: 'default'
      },
      {
        id: 'e9',
        source: 'llm_evaluator',
        target: 'output_1',
        type: 'default'
      }
    ]
  }
];

// Function to install default templates
export const installDefaultTemplates = () => {
  const TEMPLATES_STORAGE_KEY = 'metatron-saved-templates';
  
  try {
    const existingTemplates = JSON.parse(localStorage.getItem(TEMPLATES_STORAGE_KEY) || '[]');
    const existingIds = new Set(existingTemplates.map((t: any) => t.id));
    
    // Only add templates that don't already exist
    const newTemplates = defaultTemplates.filter(template => !existingIds.has(template.id));
    
    if (newTemplates.length > 0) {
      const updatedTemplates = [...existingTemplates, ...newTemplates];
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates));
      console.log(`✅ Installed ${newTemplates.length} default templates`);
      return newTemplates.length;
    } else {
      console.log('✅ All default templates already installed');
      return 0;
    }
  } catch (error) {
    console.error('❌ Error installing default templates:', error);
    return 0;
  }
};

// Function to reset all templates (useful for development)
export const resetToDefaultTemplates = () => {
  const TEMPLATES_STORAGE_KEY = 'metatron-saved-templates';
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(defaultTemplates));
  console.log('🔄 Reset to default templates');
};
