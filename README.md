# Learning Platform Next

A modern, AI-powered learning platform that provides personalized learning experiences through intelligent content processing and adaptive explanations.

## Features

### 🎓 Intelligent Learning Sessions
- Dynamic content structuring and navigation
- Three-layer concept exploration system
- Interactive questioning and explanations
- Spaced repetition for better retention
- Progress tracking and analytics

### 🤖 AI-Powered Content Processing
- Automatic document structure analysis
- Smart content indexing and organization
- Multi-layer explanation generation
- Adaptive question generation
- Creative explanations for complex concepts

### 🔒 Security & Privacy
- Google OAuth authentication
- GDPR-compliant data handling
- Rate limiting and usage tracking
- Secure document processing

## Technical Architecture

### Core Components

#### Document Processing System
- Handles document uploads up to 15MB
- Converts various formats to markdown
- Generates knowledge structure
- Creates initial concept questions
- Real-time progress updates

#### Learning Flow System
- Active session management
- Structured content presentation
- Interactive questioning system
- Creative explanation generation
- Progress tracking

#### Concept Navigation System
- Three-layer navigation structure
- Hierarchical concept organization
- Smart content filtering
- Progress-aware navigation
- Cached explanations

### AI Integration
- Claude API for intelligent responses (<32k tokens)
- Gemini API for long-context processing
- 3-minute timeout threshold
- Configurable rate limits

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google OAuth credentials
- Claude and Gemini API keys

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/learning-platform-next.git
cd learning-platform-next
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`
Edit .env with your configuration values.

4. Run database migrations:
\`\`\`bash
npx prisma migrate dev
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Usage

1. Sign in using Google authentication
2. Create a new learning session
3. Upload your learning materials
4. Navigate through the generated concept structure
5. Interact with explanations and questions
6. Track your progress through the dashboard

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with Next.js
- Powered by Claude and Gemini AI
- Uses Prisma for database management
- Styled with Tailwind CSS
