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
  ArrowRight,
  History
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
        <div className="relative">
          {/* Connection Line - Desktop */}
          <div className="hidden md:block absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
            <div className="flex items-center justify-between h-0.5 bg-gradient-to-r from-blue-400 via-green-400 to-purple-400 opacity-30">
              <div className="w-12"></div>
              <div className="w-12"></div>
              <div className="w-12"></div>
            </div>
            {/* Animated pulse effect */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 via-green-400 to-purple-400 opacity-60 animate-pulse"></div>
          </div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {agentWorkflow.map((agent, index) => (
              <div key={agent.name} className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${agent.color} font-bold text-lg mb-4 border-4 border-background shadow-lg relative z-20`}>
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {agent.name}
                </h3>
                <p className="text-muted-foreground">
                  {agent.description}
                </p>
                
                {/* Mobile arrows */}
                {index < agentWorkflow.length - 1 && (
                  <div className="md:hidden flex justify-center mt-6 mb-2">
                    <ArrowRight className="w-6 h-6 text-muted-foreground opacity-60" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const gradients = [
              'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
              'from-purple-500/20 to-pink-500/20 border-purple-500/30', 
              'from-green-500/20 to-emerald-500/20 border-green-500/30',
              'from-orange-500/20 to-red-500/20 border-orange-500/30',
              'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
              'from-teal-500/20 to-cyan-500/20 border-teal-500/30'
            ]
            const iconColors = [
              'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
              'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
              'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30', 
              'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
              'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
              'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30'
            ]
            
            return (
              <div
                key={feature.name}
                className={`group p-6 rounded-xl bg-gradient-to-br ${gradients[index]} border backdrop-blur-sm hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer`}
              >
                <div className="mb-4">
                  <div className={`inline-flex p-3 rounded-xl ${iconColors[index]} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {feature.name}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <div className="text-center p-8 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 group">
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform">3</div>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">AI Agents</div>
          <div className="text-xs text-muted-foreground/70 mt-1">Working in parallel</div>
        </div>
        <div className="text-center p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 group">
          <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform">∞</div>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">ArXiv Papers</div>
          <div className="text-xs text-muted-foreground/70 mt-1">Continuously updated</div>
        </div>
        <div className="text-center p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20 hover:border-green-500/40 transition-all duration-300 group">
          <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform">100%</div>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Automated</div>
          <div className="text-xs text-muted-foreground/70 mt-1">End-to-end process</div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-primary/5 rounded-2xl"></div>
        <div className="relative text-center p-12 backdrop-blur-sm border border-primary/30 rounded-2xl">
          <div className="mb-6">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/20 rounded-full text-primary text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              <span>Ready to get started?</span>
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Accelerate your research with 
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"> AI</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Join researchers using AI-powered analysis to discover insights, 
            identify trends, and advance knowledge faster than ever before.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/research"
              className="group inline-flex items-center space-x-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <span>Start Research</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/history"
              className="inline-flex items-center space-x-2 border-2 border-primary/30 hover:border-primary/50 text-foreground hover:bg-primary/5 px-8 py-4 rounded-xl font-semibold transition-all duration-300"
            >
              <History className="w-5 h-5" />
              <span>View Examples</span>
            </Link>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-xl"></div>
        </div>
      </div>
    </div>
  )
}

export default HomePage