# 🚀 New Agent Flow Nodes

Three powerful new nodes have been added to Agent Flow to enhance data processing and AI interaction capabilities!

## 🌐 URL Scraper Node

**Purpose:** Scrape content from any website
**Category:** Data
**Icon:** Globe

### Features:
- ✅ Enter any website URL
- ✅ Automatically scrapes and extracts text content
- ✅ Removes HTML tags and cleans the text
- ✅ Shows content preview with character count
- ✅ Copy scraped content to clipboard
- ✅ Open original URL in new tab
- ✅ Error handling for invalid URLs

### Usage:
1. Drag the URL Scraper node to your canvas
2. Enter a website URL (e.g., https://example.com)
3. Click "Scrape Website"
4. The extracted text content will be available for other nodes

### Perfect for:
- News article analysis
- Product page information extraction
- Blog post summarization
- Research data collection

---

## 🎥 YouTube Node

**Purpose:** Extract data and transcripts from YouTube videos
**Category:** Data
**Icon:** YouTube

### Features:
- ✅ Enter any YouTube URL
- ✅ Extracts video metadata (title, description, channel, duration, views)
- ✅ Shows video thumbnail
- ✅ Placeholder for transcript extraction (ready for API integration)
- ✅ Copy transcript to clipboard
- ✅ Open video in new tab
- ✅ Supports all YouTube URL formats

### Usage:
1. Drag the YouTube node to your canvas
2. Enter a YouTube URL (e.g., https://youtube.com/watch?v=...)
3. Click "Extract Video Data"
4. Video information and transcript will be available for processing

### Perfect for:
- Video content analysis
- Transcript summarization
- Educational content processing
- Meeting/lecture analysis

---

## 💬 Chat with Anything Node

**Purpose:** AI chat interface that can process any input
**Category:** Tools
**Icon:** Message Square

### Features:
- ✅ Support for OpenAI, Anthropic, and Google models
- ✅ Customizable system prompts
- ✅ Full conversation history
- ✅ Real-time chat interface
- ✅ Copy responses to clipboard
- ✅ Clear chat history
- ✅ Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### Usage:
1. Drag the Chat with Anything node to your canvas
2. Configure your preferred AI model and API key
3. Set a system prompt (e.g., "Summarize the following content")
4. Connect it to other nodes (URL Scraper, YouTube, etc.)
5. Start chatting or processing connected data

### Perfect for:
- Content summarization
- Data analysis
- Question answering
- Content rewriting
- Translation
- Creative writing

---

---

## 📄 Document Upload Node

**Purpose:** Upload and process PDF, Word, Excel, PowerPoint documents
**Category:** Tools
**Icon:** FileText

### Features:
- ✅ Support for multiple document formats (PDF, Word, Excel, PowerPoint, Text, CSV)
- ✅ Drag & drop or click to upload interface
- ✅ File size validation (10MB limit)
- ✅ Text extraction from documents
- ✅ File preview with metadata
- ✅ Copy extracted content to clipboard
- ✅ Remove uploaded files
- ✅ Real-time processing status

### Supported Formats:
- **PDF:** .pdf files
- **Word:** .doc, .docx files
- **Excel:** .xls, .xlsx files
- **PowerPoint:** .ppt, .pptx files
- **Text:** .txt, .csv files

### Usage:
1. Drag the Document Upload node to your canvas
2. Click the upload area or drag & drop a document
3. Wait for processing to complete
4. Extracted text content will be available for other nodes

### Perfect for:
- Document analysis and summarization
- Contract and legal document processing
- Research paper analysis
- Financial report processing
- Meeting notes extraction

---

## 🎨 Media Upload Node

**Purpose:** Upload and analyze images and videos
**Category:** Tools
**Icon:** Image

### Features:
- ✅ Support for images (JPG, PNG, GIF, WebP, SVG, BMP)
- ✅ Support for videos (MP4, AVI, MOV, WebM, MKV)
- ✅ Visual preview of uploaded media
- ✅ AI-powered content analysis
- ✅ Object detection and description
- ✅ Text recognition (OCR)
- ✅ File size validation (50MB limit)
- ✅ Copy analysis results to clipboard

### Analysis Features:
- **Image Analysis:** Object detection, scene description, text extraction
- **Video Analysis:** Content description, object tracking, speech-to-text (placeholder)
- **Metadata Extraction:** File info, dimensions, format details
- **Smart Descriptions:** Context-aware content analysis

### Usage:
1. Drag the Media Upload node to your canvas
2. Upload an image or video file
3. Wait for AI analysis to complete
4. Analysis results will be available for processing

### Perfect for:
- Image content analysis
- Video summarization
- Visual content moderation
- Educational material processing
- Social media content analysis

---

## 🔗 Example Workflows

### 1. Website Analysis Workflow
```
URL Scraper → Chat with Anything → Output
```
1. Scrape a website's content
2. Ask AI to summarize or analyze the content
3. Get structured insights

### 2. YouTube Video Summary
```
YouTube → Chat with Anything → Output
```
1. Extract YouTube video data and transcript
2. Ask AI to create a summary or key points
3. Get digestible video insights

### 3. Document Processing Pipeline
```
Document Upload → Chat with Anything → Output
```
1. Upload PDF, Word, or Excel document
2. Ask AI to summarize or extract key information
3. Get structured document insights

### 4. Media Analysis Workflow
```
Media Upload → Chat with Anything → Output
```
1. Upload image or video
2. Ask AI to describe, analyze, or extract information
3. Get detailed media insights

### 5. Multi-Source Research
```
URL Scraper     ↘
Document Upload → Chat with Anything → Output
Media Upload    ↗
```
1. Gather content from multiple sources
2. Combine and analyze all information
3. Generate comprehensive insights

### 6. Content Processing Pipeline
```
Input → Document Upload → Chat with Anything → Chat with Anything → Output
                              ↓                    ↓
                         (Summarize)         (Rewrite for audience)
```

---

## 🛠 Technical Details

### API Endpoints:
- `/api/scrape-url` - Handles website scraping
- `/api/youtube-data` - Processes YouTube videos
- `/api/chat-with-anything` - Manages AI conversations

### Node Data Flow:
- All nodes support input/output connections
- Data flows seamlessly between nodes
- Each node maintains its own state
- Real-time updates and error handling

### Supported Models:
- **OpenAI:** GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic:** Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Google:** Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.0 Pro

---

## 🎯 Getting Started

1. **Open Agent Flow:** http://localhost:3000
2. **Create a new flow** or open an existing one
3. **Find the new nodes** in the sidebar:
   - URL Scraper (Data category)
   - YouTube (Data category)
   - Chat with Anything (Tools category)
4. **Drag and connect** nodes to create your workflow
5. **Configure** each node with the required settings
6. **Run your workflow** and see the magic happen!

---

## 🚀 What's Next?

These nodes open up endless possibilities for AI-powered workflows:
- Content curation and analysis
- Research automation
- Social media monitoring
- Educational content processing
- Business intelligence gathering
- And much more!

Start experimenting and building powerful AI workflows today! 🎉
