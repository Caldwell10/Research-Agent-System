import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  FileText, 
  BarChart3, 
  Zap,
  Users,
  Brain,
  Clock,
  ArrowRight
} from 'lucide-react'

const HomePage: React.FC = () => {

  const features = [
    {
      name: 'Multi-Agent Analysis',
      description: 'Three specialized AI agents work together to research, analyze, and report',
      icon: Users,
    },
    {
      name: 'Intelligent Research',
      description: 'Automatically finds and evaluates relevant academic papers from ArXiv',
      icon: Brain,
    },
    {
      name: 'Real-time Updates',
      description: 'Track research progress with live WebSocket connections',
      icon: Zap,
    },
    {
      name: 'Comprehensive Reports',
      description: 'Get detailed analysis with insights, recommendations, and summaries',
      icon: FileText,
    },
    {
      name: 'Fast Processing',
      description: 'Quick analysis mode for rapid research insights',
      icon: Clock,
    },
    {
      name: 'Rich Analytics',
      description: 'Trending methods, research gaps, and technical analysis',
      icon: BarChart3,
    },
  ]

  const agentWorkflow = [
    {
      name: 'Researcher Agent',
      description: 'Finds and evaluates relevant research papers',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    {
      name: 'Analyzer Agent', 
      description: 'Performs deep technical analysis of papers',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    {
      name: 'Reporter Agent',
      description: 'Generates comprehensive research reports',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Multi-Agent Research Paper Analysis
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Harness the power of AI agents to research, analyze, and summarize academic papers 
          with unprecedented speed and accuracy.
        </p>

        <Link
          to="/research"
          className="inline-flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-medium transition-colors"
        >
          <Search className="w-5 h-5" />
          <span>Start Research</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Agent Workflow */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center text-foreground mb-8">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {agentWorkflow.map((agent, index) => (
            <div key={agent.name} className="relative">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${agent.color} font-bold text-lg mb-4`}>
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {agent.name}
                </h3>
                <p className="text-muted-foreground">
                  {agent.description}
                </p>
              </div>
              {index < agentWorkflow.length - 1 && (
                <div className="hidden md:block absolute top-6 left-full w-full">
                  <ArrowRight className="w-6 h-6 text-muted-foreground mx-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center text-foreground mb-8">
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.name}
                className="p-6 bg-card rounded-lg border border-border hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {feature.name}
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
        <div className="text-center p-6 bg-card rounded-lg border border-border">
          <div className="text-3xl font-bold text-primary mb-2">3</div>
          <div className="text-sm text-muted-foreground">AI Agents</div>
        </div>
        <div className="text-center p-6 bg-card rounded-lg border border-border">
          <div className="text-3xl font-bold text-primary mb-2">∞</div>
          <div className="text-sm text-muted-foreground">ArXiv Papers</div>
        </div>
        <div className="text-center p-6 bg-card rounded-lg border border-border">
          <div className="text-3xl font-bold text-primary mb-2"></div>
          <div className="text-sm text-muted-foreground">Analysis Time</div>
        </div>
        <div className="text-center p-6 bg-card rounded-lg border border-border">
          <div className="text-3xl font-bold text-primary mb-2">100%</div>
          <div className="text-sm text-muted-foreground">Automated</div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center p-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Ready to accelerate your research?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Join researchers using AI-powered analysis to discover insights, 
          identify trends, and advance knowledge faster than ever before.
        </p>
        <Link
          to="/research"
          className="inline-flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

export default HomePage