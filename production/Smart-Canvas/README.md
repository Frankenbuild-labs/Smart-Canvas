# 🎨 Smart Canvas - AI Workflow Builder
![Screenshot 2025-07-18 115120](https://github.com/user-attachments/assets/28e700a2-4b14-4311-a518-f3f6163d56f7)
![Screenshot 2025-07-18 120125](https://github.com/user-attachments/assets/a39b295f-2eef-4874-97c8-a26bcc01d08d)
![Screenshot 2025-07-18 120201](https://github.com/user-attachments/assets/989ba687-6252-456d-bbb2-0ec67f03f8cd)



**The most powerful open-source AI workflow builder with 300+ tool integrations**

Smart Canvas is a visual workflow builder that lets you create complex AI workflows through an intuitive drag-and-drop interface. Connect LLMs, tools, databases, and APIs to build powerful automation workflows.

## 🚀 **Complete AI Workflow Builder - Production Ready!**

✨ **What makes Smart Canvas special:**
- **Visual workflow builder** with drag & drop interface
- **300+ tool integrations** via Composio (Gmail, Slack, GitHub, etc.)
- **Real OAuth & API key authentication** - no mocks, no fallbacks
- **AI-powered chat-to-workflow generation**
- **LLM nodes** (OpenAI, Anthropic, Google Gemini)
- **Agent nodes** with tool access
- **Template system** for saving/sharing workflows
- **Background customization** with animations
- **Complete backend API** with FastAPI
- **Production-ready** - ready to ship!

🎯 **Open source MIT license** - community contributions welcome!

## ✨ Features

### 🎯 **Visual Workflow Builder**
- **Drag & Drop Interface** - Build workflows visually with nodes and connections
- **Real-time Execution** - See your workflows run in real-time with visual feedback
- **Template System** - Save and share workflow templates
- **Background Customization** - Beautiful animated backgrounds

### 🔧 **300+ Tool Integrations**
- **MCP Tools** - Connect to Gmail, Slack, GitHub, Google Sheets, and 300+ more
- **OAuth & API Key Auth** - Secure authentication for all services
- **Real Connections** - No mocks, no fallbacks - production-ready integrations

### 🤖 **AI-Powered**
- **Chat-to-Workflow** - Describe your workflow in natural language, get a working flow
- **LLM Nodes** - Support for OpenAI, Anthropic, Google Gemini, and more
- **Agent Nodes** - AI agents with tool access for complex tasks
- **Coordinator Nodes** - Multi-agent coordination and orchestration

### 📊 **Data & Storage**
- **Vector Stores** - Pinecone, Weaviate integration for semantic search
- **Databases** - PostgreSQL, MySQL, MongoDB connections
- **File Storage** - AWS S3, Google Cloud Storage integration
- **Memory Systems** - Conversation and context memory

### 🎨 **Media & Content**
- **Image Generation** - DALL-E, Stable Diffusion integration
- **Text-to-Speech** - ElevenLabs, OpenAI TTS
- **Document Processing** - PDF, Word, Excel upload and processing
- **URL Scraping** - Extract content from any website

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Frankenbuild-labs/Smart-Canvas.git
cd Smart-Canvas
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
# Copy example env file
cp .env.example .env

# Add your API keys
COMPOSIO_API_KEY=your_composio_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

5. **Start the application**
```bash
# Start backend (in backend directory)
python main.py

# Start frontend (in root directory)
npm run dev
```

6. **Open Smart Canvas**
Navigate to `http://localhost:3000` and start building!

## 📖 Documentation

### Building Your First Workflow
1. **Add Nodes** - Drag nodes from the sidebar to the canvas
2. **Connect Nodes** - Draw connections between node outputs and inputs
3. **Configure Nodes** - Click nodes to set up their parameters
4. **Connect Tools** - Use the MCP Tools panel to connect external services
5. **Run Workflow** - Click the run button to execute your workflow

### Node Types
- **Input/Output** - Start and end points for your workflow
- **LLM** - Language model calls (GPT-4, Claude, Gemini)
- **Agent** - AI agents with tool access
- **Tools** - External service integrations
- **Data** - Database and storage operations
- **Media** - Image, audio, and document processing

## 🛠️ Development

### Project Structure
```
Smart-Canvas/
├── app/                    # Next.js application
├── components/             # React components
├── lib/                    # Utilities and helpers
├── backend/               # Python backend
│   ├── api/              # API endpoints
│   └── core/             # Core utilities
└── public/               # Static assets
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🔑 API Keys

Smart Canvas integrates with many services. You'll need API keys for:

- **Composio** - For 300+ tool integrations
- **OpenAI** - For GPT models
- **Anthropic** - For Claude models
- **Google** - For Gemini models
- **ElevenLabs** - For text-to-speech
- **Pinecone** - For vector storage

## 🌟 Examples

### Simple Workflow
1. **Input Node** → **LLM Node** → **Output Node**
2. Connect to process text through an AI model

### Complex Automation
1. **Gmail Tool** → **LLM Analysis** → **Slack Notification**
2. Automatically analyze emails and send summaries to Slack

### Data Pipeline
1. **Database Query** → **Vector Store** → **Semantic Search**
2. Build intelligent search over your data

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🤝 Community

- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Community discussions and help
- **Discord** - Real-time community chat (coming soon)

## 🙏 Acknowledgments

Built with:
- **Next.js** - React framework
- **React Flow** - Visual workflow editor
- **Composio** - Tool integrations
- **FastAPI** - Python backend
- **Tailwind CSS** - Styling

---

**Start building powerful AI workflows today!** 🚀
