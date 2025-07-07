<img width="782" alt="Screenshot 2025-07-07 at 4 52 13 PM" src="https://github.com/user-attachments/assets/19aada0d-1329-48e5-922c-9a6844e5cb24" /># 🎯 Azure AI Real-Time Chat Application

A sophisticated, real-time AI chat application built with Next.js and Azure OpenAI services, featuring voice interaction, intelligent search capabilities, and a modern, responsive UI.

<img width="779" alt="Screenshot 2025-07-07 at 4 52 22 PM" src="https://github.com/user-attachments/assets/44d88661-6ce4-4f39-9b02-de8dd19d28bb" />


![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.3.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Azure](https://img.shields.io/badge/Azure-OpenAI-orange)

## ✨ Features

### 🎤 **Real-Time Voice Interaction**
- **High-Quality Audio Processing**: 24kHz audio sampling with real-time processing
- **Advanced Voice Activity Detection**: Server VAD and Azure Semantic VAD options
- **Visual Audio Feedback**: Real-time audio visualization with animated recording indicators
- **Smart Turn Detection**: Intelligent conversation flow management

### 🤖 **AI-Powered Conversations**
- **Azure OpenAI Integration**: Powered by GPT-4 and advanced language models
- **Agent-Based Architecture**: Configurable AI agents with specialized capabilities
- **Function Calling**: Extensible tool system for enhanced AI capabilities
- **Proactive Engagement**: Smart greeting and inactivity management

### 🔍 **Intelligent Search**
- **Azure Cognitive Search**: Integration with Azure Search Documents
- **Knowledge Base Access**: Searchable information repository
- **Contextual Results**: Intelligent search result formatting and presentation

### 🎨 **Modern UI/UX**
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Dark/Light Theme**: Automatic theme switching with user preferences
- **Component Library**: Built with Radix UI and Tailwind CSS
- **Smooth Animations**: Engaging micro-interactions and transitions
- **Accessibility**: WCAG compliant interface design

### ⚙️ **Advanced Configuration**
- **Voice Customization**: Multiple voice options and custom voice support
- **Avatar Integration**: Configurable AI avatar display
- **Flexible Settings**: Comprehensive configuration panel
- **Environment Management**: Secure environment variable handling

## 🏗️ Architecture

### **Frontend Stack**
- **Framework**: Next.js 15.3.0 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom design system
- **Components**: Radix UI primitives with custom styling
- **State Management**: React hooks and context
- **Audio Processing**: Web Audio API with AudioWorklet

### **Backend Integration**
- **Azure OpenAI**: Real-time API integration
- **Azure Search**: Document search and retrieval
- **Authentication**: Entra ID (Azure AD) authentication
- **Real-Time Client**: Custom RT client for WebSocket communication

### **Key Components**

#### 🎯 **ChatInterface** (`src/app/chat-interface.tsx`)
The main application component featuring:
- Real-time chat interface
- Voice recording controls
- Configuration panel
- Message history
- Tool integration

#### 🔊 **AudioHandler** (`src/lib/audio.ts`)
Advanced audio processing system:
- WebRTC audio capture
- Real-time audio analysis
- Playback queue management
- Visual feedback rendering

#### ⚡ **ProactiveEventManager** (`src/lib/proactive-event-manager.ts`)
Intelligent interaction management:
- Automatic greeting system
- Inactivity detection
- Event-driven responses

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn** package manager
- **Azure Subscription** with OpenAI services
- **Azure CLI** (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jie-speech/react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Azure OpenAI Configuration
   AZURE_OPENAI_ENDPOINT=https://aif-jiehao-project-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key-here
   AZURE_ENTRA_TOKEN=your-entra-token-here
   
   # Agent Configuration
   AZURE_PROJECT_NAME=aif-jiehao-project
   AZURE_AGENT_ID=asst_sEQhM1NFxIRpyS7UsM1Guk9I
   
   # Application Settings
   NEXT_PUBLIC_AZURE_REGION=eastus2
   ```

4. **Azure Authentication**
   ```bash
   # Login to Azure
   az login
   
   # Get access token
   az account get-access-token --resource https://ai.azure.com --query accessToken -o tsv
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### Azure AI Services Setup

1. **Resource Requirements**
   - Azure OpenAI resource in `eastus2` or `swedencentral` region
   - Entra ID authentication enabled
   - Appropriate API quotas and permissions

2. **Agent Configuration**
   - **Project Name**: `aif-jiehao-project`
   - **Agent ID**: `asst_sEQhM1NFxIRpyS7UsM1Guk9I`
   - **Capabilities**: Generalist AI with web search integration

### Voice Settings

- **Default Voices**: Multiple pre-configured voice options
- **Custom Voices**: Support for custom voice deployments
- **Voice Parameters**: Configurable temperature and speech settings

### Turn Detection Options

- **Server VAD**: Server-side voice activity detection (default)
- **Azure Semantic VAD**: Enhanced semantic voice activity detection
- **Manual Mode**: User-controlled turn management

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── chat-interface.tsx  # Main chat component
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── svg.tsx            # SVG icon components
├── components/
│   └── ui/                # Reusable UI components
│       ├── accordion.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── slider.tsx
│       ├── switch.tsx
│       ├── theme-provider.tsx
│       └── theme-toggle.tsx
├── lib/                   # Utility libraries
│   ├── audio.ts          # Audio processing
│   ├── proactive-event-manager.ts
│   └── utils.ts          # Utility functions
public/
├── audio-processor.js     # Audio worklet processor
└── icon.svg              # Application icon
```

### Key Dependencies

#### **Core Framework**
- `next`: React framework with SSR/SSG capabilities
- `react`: UI library
- `typescript`: Type-safe JavaScript

#### **Azure Integration**
- `@azure/search-documents`: Azure Cognitive Search client
- `rt-client`: Custom real-time client library

#### **UI Components**
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS framework
- `lucide-react`: Modern icon library
- `next-themes`: Theme management

#### **Utilities**
- `class-variance-authority`: Type-safe variant styling
- `tailwind-merge`: Tailwind class merging
- `react-markdown`: Markdown rendering

## 🎨 Theming

The application features a comprehensive design system with:

- **Color Palette**: Carefully crafted light and dark themes
- **Typography**: Inter font family with multiple weights
- **Spacing**: Consistent spacing scale
- **Animations**: Smooth transitions and micro-interactions
- **Responsive Design**: Mobile-first breakpoint system

### Custom CSS Variables

The theme system uses CSS custom properties for:
- Background and foreground colors
- Primary and secondary color schemes
- Muted and accent colors
- Border and input styling
- Chart color palette

## 🔒 Security

- **Environment Variables**: Secure handling of sensitive data
- **Azure Authentication**: Enterprise-grade Entra ID integration
- **HTTPS**: Secure communication protocols
- **Input Validation**: Comprehensive input sanitization

## 📱 Browser Support

- **Chrome**: 88+ (recommended)
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

*Note: WebRTC and Web Audio API support required for voice features*

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Static Export

The application is configured for static export:

```bash
npm run build
# Static files generated in 'out' directory
```

### Azure Deployment

The application can be deployed to:
- Azure Static Web Apps
- Azure App Service
- Azure Container Instances

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Review the troubleshooting section below
- Check Azure OpenAI service status
- Verify authentication tokens are current

### Common Issues

1. **Audio not working**: Ensure microphone permissions are granted
2. **Authentication errors**: Refresh Azure tokens
3. **Connection issues**: Verify Azure service endpoints
4. **Build errors**: Clear node_modules and reinstall dependencies

---

**Built with ❤️ using Next.js, Azure OpenAI, and modern web technologies**
