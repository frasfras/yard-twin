import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  RefreshCw, 
  Bot, 
  User, 
  Sparkles, 
  Cpu, 
  AlertCircle, 
  Terminal, 
  Loader2,
  Plus,
  Trash2,
  Globe,
  Code,
  Database,
  Shield,
  X,
  Check,
  Menu,
  ChevronRight,
  Info,
  ExternalLink,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Message, Agent } from './types';
import AnalyticsDashboard from './components/AnalyticsDashboard';

const INITIAL_AGENTS: Agent[] = [
  {
    id: "agent-jun",
    name: "Agent Jun",
    version: "v1.0.4",
    description: "Deployment pipeline analyzer & systems operator.",
    appName: "app",
    userId: "web-user-01",
    baseUrl: "https://myportagent-jun-1008791897094.us-east1.run.app",
    iconType: "cpu",
    accentColor: "violet",
    status: "active"
  },
  {
    id: "agent-sierra",
    name: "Agent Sierra",
    version: "v1.2.0",
    description: "Code Quality advice compiler & refactoring engineer.",
    appName: "developer-app",
    userId: "web-user-01",
    baseUrl: "https://myportagent-jun-1008791897094.us-east1.run.app",
    iconType: "code",
    accentColor: "emerald",
    status: "active"
  },
  {
    id: "agent-gate",
    name: "Gate Agent ",
    version: "v1.2.0",
    description: "Gate Management agent",
    appName: "app",
    userId: "web-user-01",
    baseUrl: "https://mygateagent-may-1008791897094.us-east1.run.app",
    iconType: "code",
    accentColor: "emerald",
    status: "active"
  },
  {
    id: "agent-incident",
    name: "Agent Incident",
    version: "v1.2.0",
    description: "Incident gate managment",
    appName: "app",
    userId: "web-user-01",
    baseUrl: "https://myincidentagent-jun-1008791897094.us-east1.run.app",
    iconType: "code",
    accentColor: "emerald",
    status: "active"
  },
  {
    id: "agent-control",
    name: "Agent Control tower",
    version: "v1.2.0",
    description: "Dock Gate analytics.",
    appName: "app",
    userId: "web-user-01",
    baseUrl: "https://myanalyticsagent-jun-1008791897094.us-east1.run.app",
    iconType: "code",
    accentColor: "emerald",
    status: "active"
  }
];

// Quick starer questions categorized per agent
const QUICK_PROMPTS_MAP: { [key: string]: string[] } = {
  "agent-jun": [
    "Hello! What goals can you help me perform today?",
    "Check my active deployment logs for errors",
    "List recently completed execution processes",
    "How do I trigger a new automated port release?"
  ],
  "agent-sierra": [
    "Analyze a quick sample React TypeScript component",
    "What are modern best practices for clean State Hooks?",
    "Help me formulate a custom generic utility type",
    "Suggest refactoring steps for code readability"
  ],
  "gate-agent": [
    "which docks are free",
    'find vehicles with status "waiting"',
    "show congested areas"
  ],
  "default": [
    "Hi there! Introduce your core directives.",
    "Can you help me formulate clean technical commands?",
    "Explain how custom payloads and metadata operate.",
    "Draft a clean documentation summary for our session."
  ]
};

export default function App() {
  // Load Agents list from localstorage to ensure persistence
  const [agents, setAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('agent_deployer_agents');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_AGENTS;
      }
    }
    return INITIAL_AGENTS;
  });

  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    const saved = localStorage.getItem('agent_deployer_active_id');
    return saved || INITIAL_AGENTS[0].id;
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');

  // Isolated chat histories and sessioIds per agent ID
  const [sessionsMap, setSessionsMap] = useState<{ [agentId: string]: string }>(() => {
    const saved = localStorage.getItem('agent_deployer_sessions');
    return saved ? JSON.parse(saved) : {};
  });

  const [historiesMap, setHistoriesMap] = useState<{ [agentId: string]: Message[] }>(() => {
    const saved = localStorage.getItem('agent_deployer_histories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Cast raw strings back to Date objects
        const hydrated: { [agentId: string]: Message[] } = {};
        Object.keys(parsed).forEach(id => {
          hydrated[id] = parsed[id].map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        });
        return hydrated;
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  // Editor/Register Modal details
  const [isRegistering, setIsRegistering] = useState(false);
  const [newAgent, setNewAgent] = useState<Omit<Agent, 'status'>>({
    id: "",
    name: "",
    version: "v1.0.0",
    description: "",
    appName: "app",
    userId: "web-user-01",
    baseUrl: "https://myportagent-jun-1008791897094.us-east1.run.app",
    iconType: "cpu",
    accentColor: "sky"
  });

  // UI state controls
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Derive active agent configuration
  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0] || INITIAL_AGENTS[0];
  const activeSessionId = sessionsMap[activeAgent.id] || "";
  const activeHistory = historiesMap[activeAgent.id] || [
    {
      id: `welcome-${activeAgent.id}`,
      role: 'assistant',
      text: `Deploy sequence complete. Custom agent **${activeAgent.name}** (${activeAgent.version}) successfully mounted.\n\nReady to analyze payload variables on endpoint: \`${activeAgent.baseUrl}\` with target user context: \`${activeAgent.userId}\`. How can I assist you in operations?`,
      timestamp: new Date()
    }
  ];

  // Colors dictionary mapping the theme names to Tailwind classes
  const colorMap: { [key: string]: { bg: string, text: string, border: string, glow: string, bubble: string, focus: string } } = {
    violet: {
      bg: "bg-violet-600",
      text: "text-violet-400",
      border: "border-violet-500/20",
      glow: "shadow-violet-500/20",
      bubble: "border-violet-500/30 bg-violet-600/10 text-violet-100",
      focus: "focus:border-violet-500 focus:ring-violet-500/50"
    },
    emerald: {
      bg: "bg-emerald-600",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      glow: "shadow-emerald-500/20",
      bubble: "border-emerald-500/30 bg-emerald-600/10 text-emerald-100",
      focus: "focus:border-emerald-500 focus:ring-emerald-500/50"
    },
    sky: {
      bg: "bg-sky-600",
      text: "text-sky-400",
      border: "border-sky-500/20",
      glow: "shadow-sky-500/20",
      bubble: "border-sky-500/30 bg-sky-600/10 text-sky-100",
      focus: "focus:border-sky-500 focus:ring-sky-500/50"
    },
    rose: {
      bg: "bg-rose-600",
      text: "text-rose-400",
      border: "border-rose-500/20",
      glow: "shadow-rose-500/20",
      bubble: "border-rose-500/30 bg-rose-600/10 text-rose-100",
      focus: "focus:border-rose-500 focus:ring-rose-500/50"
    },
    amber: {
      bg: "bg-amber-600",
      text: "text-amber-400",
      border: "border-amber-500/20",
      glow: "shadow-amber-500/20",
      bubble: "border-amber-500/30 bg-amber-600/10 text-amber-100",
      focus: "focus:border-amber-500 focus:ring-amber-500/50"
    }
  };

  const activeColors = colorMap[activeAgent.accentColor] || colorMap.violet;

  // Persist edits to localStorage
  useEffect(() => {
    localStorage.setItem('agent_deployer_agents', JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    localStorage.setItem('agent_deployer_active_id', selectedAgentId);
  }, [selectedAgentId]);

  useEffect(() => {
    localStorage.setItem('agent_deployer_sessions', JSON.stringify(sessionsMap));
  }, [sessionsMap]);

  useEffect(() => {
    localStorage.setItem('agent_deployer_histories', JSON.stringify(historiesMap));
  }, [historiesMap]);

  // Helper: Deep-search through JSON structures for key elements like "text" or "content"
  const findDeepestText = (obj: any): string | null => {
    if (!obj) return null;
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return null; // Ignore asset artifacts
      }
      // High-fidelity safeguard: Ignore long base64 strings or signatures with no spacing
      if (trimmed.length > 80 && !trimmed.includes(" ")) {
        return null;
      }
      return trimmed;
    }
    if (typeof obj !== 'object') return null;

    const priorityKeys = ['text', 'content', 'message', 'response', 'output', 'data', 'value', 'body', 'result', 'msg'];
    for (const key of priorityKeys) {
      if (typeof obj[key] === 'string' && obj[key].trim()) {
        const val = obj[key].trim();
        if (key === 'data' && (val.length < 5 || val === 'success' || val === 'error' || val === 'completed')) {
          continue;
        }
        // Ignores base64 tokens inside priority elements
        if (val.length > 80 && !val.includes(" ")) {
          continue;
        }
        return val;
      }
    }

    if (Array.isArray(obj.parts)) {
      for (const part of obj.parts) {
        const txt = findDeepestText(part);
        if (txt) return txt;
      }
    }

    for (const key of priorityKeys) {
      const val = obj[key];
      if (val && typeof val === 'object') {
        const txt = findDeepestText(val);
        if (txt) return txt;
      }
    }

    const ignoredKeys = [
      'session_id', 'sessionId', 'user_id', 'userId', 'app_name', 'appName', 
      'type', 'status', 'state', 'timestamp', 'id', 'event_id', 'run_id', 'role',
      'thoughtSignature', 'thought_signature', 'signature', 'usageMetadata', 'usage_metadata',
      'modelVersion', 'model_version', 'finishReason', 'finish_reason', 'invocationId', 'invocation_id',
      'author', 'actions', 'action', 'artifactDelta', 'stateDelta'
    ];

    for (const key of Object.keys(obj)) {
      if (priorityKeys.includes(key)) continue;
      if (ignoredKeys.includes(key)) continue;

      const val = obj[key];
      if (val && (typeof val === 'object' || typeof val === 'string')) {
        const txt = findDeepestText(val);
        if (txt) return txt;
      }
    }

    return null;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll viewport trigger
  useEffect(() => {
    scrollToBottom("smooth");
  }, [activeHistory, isThinking]);

  // Thinking Countdown loop
  useEffect(() => {
    if (isThinking) {
      setThinkingSeconds(0);
      timerRef.current = setInterval(() => {
        setThinkingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isThinking]);

  // Fetch a fresh session ID from target agent, persist it, and return it
  const getFreshSession = async (agentToRun: Agent): Promise<string> => {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        baseUrl: agentToRun.baseUrl,
        appName: agentToRun.appName,
        userId: agentToRun.userId
      })
    });

    if (!response.ok) {
      throw new Error(`Upstream returned code: ${response.status}`);
    }

    const data = await response.json();
    const extractedSessionId = data.id || data.session_id || data.sessionId || data.session?.id || data.session?.session_id;
    
    let sessionIdResolved = "";
    if (extractedSessionId) {
      sessionIdResolved = String(extractedSessionId);
    } else {
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'string' && data[key].length > 4) {
          sessionIdResolved = data[key];
          break;
        }
      }
    }

    if (!sessionIdResolved) {
      throw new Error("No unique session keys detected inside payload response.");
    }

    // Commit to mapping State
    setSessionsMap(prev => ({
      ...prev,
      [agentToRun.id]: sessionIdResolved
    }));

    return sessionIdResolved;
  };

  // Boot or Reset session context for the currently targeted agent
  const initializeAgentSession = async (agentToRun: Agent, forceReset: boolean = false) => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const sessionIdResolved = await getFreshSession(agentToRun);

      if (forceReset) {
        const resetMessages: Message[] = [
          {
            id: `sys-reset-${Date.now()}`,
            role: "assistant",
            text: `🔄 Dialogue model successfully rebooted. A fresh diagnostic session (\`${sessionIdResolved}\`) has been negotiated with target endpoint. High-fidelity operations restored!`,
            timestamp: new Date()
          }
        ];
        setHistoriesMap(prev => ({
          ...prev,
          [agentToRun.id]: resetMessages
        }));
      }
    } catch (err: any) {
      console.warn(`Upstream handshake for ${agentToRun.name} fell back:`, err);
      // Fallback fallback ID creation if local sandbox isolates connections
      const fallbackId = `fallback-${agentToRun.id}-${Math.random().toString(36).substring(2, 8)}`;
      setSessionsMap(prev => {
        if (!prev[agentToRun.id]) {
          return { ...prev, [agentToRun.id]: fallbackId };
        }
        return prev;
      });
      if (forceReset) {
        setHistoriesMap(prev => ({
          ...prev,
          [agentToRun.id]: [
            {
              id: `sys-reset-${Date.now()}`,
              role: "assistant",
              text: `🔄 Locally reset conversational channel. Upstream is standing by in offline simulation buffer. Run tests freely.`,
              timestamp: new Date()
            }
          ]
        }));
      }
    } finally {
      setSessionLoading(false);
    }
  };

  // Launch initial checks when active agent key changes
  useEffect(() => {
    const currentSession = sessionsMap[activeAgent.id];
    if (!currentSession) {
      initializeAgentSession(activeAgent, false);
    }
  }, [selectedAgentId]);

  // Command transmitter code
  const handleSendMessage = async (textToSend: string) => {
    const trimmedInput = textToSend.trim();
    if (!trimmedInput || isThinking || sessionLoading) return;

    setRequestError(null);
    setInputValue("");

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: trimmedInput,
      timestamp: new Date()
    };

    // Update active history list immutably
    const updatedHistory = [...activeHistory, userMsg];
    setHistoriesMap(prev => ({
      ...prev,
      [activeAgent.id]: updatedHistory
    }));

    setIsThinking(true);

    try {
      let targetSessionId = activeSessionId;
      if (!targetSessionId) {
        try {
          targetSessionId = await getFreshSession(activeAgent);
        } catch (sessErr) {
          targetSessionId = `fallback-${activeAgent.id}`;
        }
      }

      const payload = {
        baseUrl: activeAgent.baseUrl,
        appName: activeAgent.appName,
        userId: activeAgent.userId,
        sessionId: targetSessionId,
        newMessage: {
          parts: [{ text: trimmedInput }]
        }
      };

      let response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      // Handle 404 Session Not Found proactively with auto-healing retry
      if (response.status === 404) {
        console.log("Stale or expired session ID (404) detected. Initiating auto-healing session renewal...");
        try {
          const renewedSessionId = await getFreshSession(activeAgent);
          payload.sessionId = renewedSessionId;
          
          console.log("Retrying message post with fresh session ID:", renewedSessionId);
          response = await fetch("/api/run", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
        } catch (renewErr: any) {
          console.error("Auto-healing session renewal failed:", renewErr);
        }
      }

      if (!response.ok) {
        throw new Error(`Port agent returned downstream error code: ${response.status}`);
      }

      const responseText = await response.text();
      let events: any[] = [];
      let isPlainString = false;

      const trimmedRes = responseText.trim();
      if (!trimmedRes.startsWith("{") && !trimmedRes.startsWith("[")) {
        isPlainString = true;
      } else {
        try {
          const parsed = JSON.parse(trimmedRes);
          if (Array.isArray(parsed)) {
            events = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.events)) {
              events = parsed.events;
            } else if (Array.isArray(parsed.messages)) {
              events = parsed.messages;
            } else if (Array.isArray(parsed.data)) {
              events = parsed.data;
            } else {
              events = [parsed];
            }
          }
        } catch (e) {
          try {
            const lines = trimmedRes.split("\n").filter(l => l.trim().startsWith("{") || l.trim().startsWith("["));
            if (lines.length > 0) {
              events = lines.map(l => JSON.parse(l));
            } else {
              isPlainString = true;
            }
          } catch (ne) {
            isPlainString = true;
          }
        }
      }

      if (isPlainString) {
        events = [{ text: responseText }];
      }

      let botResponseText = "";
      for (let i = events.length - 1; i >= 0; i--) {
        const textFound = findDeepestText(events[i]);
        if (textFound && textFound.trim()) {
          botResponseText = textFound.trim();
          break;
        }
      }

      if (!botResponseText) {
        if (events.length > 0) {
          const lastEvent = events[events.length - 1];
          botResponseText = typeof lastEvent === 'string' ? lastEvent : JSON.stringify(lastEvent, null, 2);
        } else {
          botResponseText = responseText || "Diagnostics processed empty event logs.";
        }
      }

      const assistantMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: botResponseText,
        timestamp: new Date()
      };

      setHistoriesMap(prev => ({
        ...prev,
        [activeAgent.id]: [...updatedHistory, assistantMsg]
      }));
    } catch (err: any) {
      console.error("Payload transmitter caught exception:", err);
      setRequestError(err.message || "Upstream failure communicating with host route.");
      
      const errMsg: Message = {
        id: `bot-err-${Date.now()}`,
        role: "assistant",
        text: `⚠️ **Endpoint Response Outage**: We could not negotiate payload execution with our target URL agent services.\n\n*Error details: ${err.message || "Network isolation / unreachable agent"}*\n\nIf you hosted a custom model, ensure CORS handles incoming workspace routing, or test with a simulated query.`,
        timestamp: new Date()
      };

      setHistoriesMap(prev => ({
        ...prev,
        [activeAgent.id]: [...updatedHistory, errMsg]
      }));
    } finally {
      setIsThinking(false);
    }
  };

  const handleRegisterNewAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgent.name.trim() || !newAgent.baseUrl.trim()) return;

    // Generate neat unique ID key
    const uniqueId = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const freshAgent: Agent = {
      ...newAgent,
      id: uniqueId,
      name: newAgent.name.trim(),
      version: newAgent.version.trim() || "v1.0.0",
      description: newAgent.description.trim() || "Dynamic secondary portal custom agent.",
      appName: newAgent.appName.trim() || "app",
      userId: newAgent.userId.trim() || "web-user-01",
      status: 'active'
    };

    setAgents(prev => [...prev, freshAgent]);
    setSelectedAgentId(uniqueId);
    
    // Close modal and clear builder
    setIsRegistering(false);
    setNewAgent({
      id: "",
      name: "",
      version: "v1.0.0",
      description: "",
      appName: "app",
      userId: "web-user-01",
      baseUrl: "https://myportagent-jun-1008791897094.us-east1.run.app",
      iconType: "cpu",
      accentColor: "sky"
    });
  };

  const handleDeleteAgent = (agentIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering switch
    if (confirm("Are you sure you want to remove this custom agent configuration?")) {
      setAgents(prev => prev.filter(a => a.id !== agentIdToDelete));
      
      // If we deleted the active one, fallback safely
      if (selectedAgentId === agentIdToDelete) {
        const remaining = agents.filter(a => a.id !== agentIdToDelete);
        if (remaining.length > 0) {
          setSelectedAgentId(remaining[0].id);
        } else {
          setAgents(INITIAL_AGENTS);
          setSelectedAgentId(INITIAL_AGENTS[0].id);
        }
      }

      // Cleanup caches
      const sessCopy = { ...sessionsMap };
      delete sessCopy[agentIdToDelete];
      setSessionsMap(sessCopy);

      const histCopy = { ...historiesMap };
      delete histCopy[agentIdToDelete];
      setHistoriesMap(histCopy);
    }
  };

  const renderIcon = (type: string, className = "w-4 h-4 text-white") => {
    switch (type) {
      case 'sparkles': return <Sparkles className={className} />;
      case 'code': return <Code className={className} />;
      case 'database': return <Database className={className} />;
      case 'shield': return <Shield className={className} />;
      case 'terminal': return <Terminal className={className} />;
      default: return <Cpu className={className} />;
    }
  };

  const isGateAgent = 
    activeAgent.id.toLowerCase().includes('gate') || 
    activeAgent.name.toLowerCase().includes('gate') || 
    activeAgent.appName.toLowerCase().includes('gate') ||
    (activeAgent.description && activeAgent.description.toLowerCase().includes('gate'));

  const quickPrompts = isGateAgent 
    ? QUICK_PROMPTS_MAP["gate-agent"] 
    : (QUICK_PROMPTS_MAP[activeAgent.id] || QUICK_PROMPTS_MAP.default);

  return (
    <div id="glow_chat_app_root" className="min-h-screen bg-[#07070a] text-zinc-100 flex font-sans relative overflow-hidden selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* Immersive background spatial grid glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-600/[0.03] rounded-full blur-[160px] pointer-events-none -translate-y-1/3 select-none" />
      <div className="absolute bottom-1/4 left-10 w-[500px] h-[500px] bg-indigo-500/[0.04] rounded-full blur-[140px] pointer-events-none select-none" />

      {/* MOBILE HEADER - TO TOGGLE AGENT MENU */}
      <div className="lg:hidden absolute top-0 left-0 right-0 h-16 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500/50 rounded-lg hover:bg-zinc-800 text-zinc-400"
          >
            <Menu className="w-5 h-5 text-zinc-300" />
          </button>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-md ${activeColors.bg} flex items-center justify-center`}>
              {renderIcon(activeAgent.iconType, "w-1.5 h-1.5 text-white")}
            </span>
            <span className="font-bold text-sm tracking-tight text-zinc-100">{activeAgent.name}</span>
          </div>
        </div>
        <button
          onClick={() => initializeAgentSession(activeAgent, true)}
          disabled={sessionLoading}
          className="text-xs font-semibold tracking-wider text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-800/60 py-1.5 px-3 rounded-full border border-zinc-700/80 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${sessionLoading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Reset</span>
        </button>
      </div>

      {/* MOBILE INTEGRATED TAB SELECTOR */}
      <div className="lg:hidden fixed top-16 left-0 right-0 h-14 bg-zinc-950 border-b border-zinc-900/50 flex items-center justify-center gap-3 z-35 px-6">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 text-center py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all outline-none border cursor-pointer active:scale-95 ${
            activeTab === 'chat'
              ? 'bg-zinc-900 text-violet-400 border-zinc-800'
              : 'text-zinc-500 hover:text-zinc-350 border-transparent'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Console Chat</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 text-center py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all outline-none border cursor-pointer active:scale-95 ${
            activeTab === 'dashboard'
              ? 'bg-zinc-900 text-violet-400 border-zinc-800'
              : 'text-zinc-500 hover:text-zinc-350 border-transparent'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
      </div>

      {/* COMPACT DASHBOARD SIDEBAR (DESKTOP AND DRAWER) */}
      <aside 
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-80 bg-zinc-950 border-r border-zinc-900 flex flex-col shrink-0 transition-transform duration-300 transform lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar glass header */}
        <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-widest text-zinc-200 uppercase">Agent Hub</span>
          </div>

          <button 
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-zinc-800 text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic active deployments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between px-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest select-none">
            <span>Live Deployments</span>
            <span className="bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-400 font-mono text-[9px] lowercase font-normal">
              {agents.length} active
            </span>
          </div>

          <div className="space-y-1.5">
            {agents.map((agent) => {
              const isActive = agent.id === selectedAgentId;
              const agentColors = colorMap[agent.accentColor] || colorMap.violet;

              return (
                <div
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    setSidebarOpen(false);
                  }}
                  className={`group relative w-full flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-zinc-900/80 border-violet-500/20 shadow-md shadow-violet-550/5' 
                      : 'bg-zinc-950/20 border-zinc-900 hover:border-zinc-820 hover:bg-zinc-900/30'
                  }`}
                >
                  {/* Active theme indicators */}
                  <div className={`w-8 h-8 rounded-lg ${agentColors.bg} flex items-center justify-center shrink-0 shadow-sm shadow-zinc-900/40 opacity-90 group-hover:scale-105 transition-transform`}>
                    {renderIcon(agent.iconType, "w-4 h-4 text-white")}
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs tracking-wide text-zinc-200 truncate group-hover:text-zinc-100">
                        {agent.name}
                      </span>
                      <span className="font-mono text-[9px] opacity-60 text-zinc-400 shrink-0">
                        {agent.version}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                      {agent.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-mono text-[8px] text-zinc-600 truncate uppercase">
                        {agent.appName}
                      </span>
                    </div>
                  </div>

                  {/* Remove agent unless it's the core default Jun agent */}
                  {agent.id !== 'agent-jun' && (
                    <button
                      onClick={(e) => handleDeleteAgent(agent.id, e)}
                      className="absolute right-2 top-2 p-1 rounded bg-zinc-950 opacity-0 group-hover:opacity-100 hover:bg-red-550/10 hover:text-red-400 border border-zinc-900 text-zinc-500 transition-all cursor-pointer"
                      title="Undeploy Agent"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Prompt banner info */}
          <div className="pt-2">
            <button
              onClick={() => setIsRegistering(true)}
              className="w-full py-2 px-4 bg-zinc-900 hover:bg-zinc-850 hover:border-violet-550/50 text-zinc-200 hover:text-white rounded-xl border border-zinc-850 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-violet-400" />
              <span>Deploy New Agent</span>
            </button>
          </div>
        </div>

        {/* Workspace instructions overlay footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900">
          <div className="p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-[10px] tracking-wide uppercase select-none">
              <Info className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>Deployment Integration</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
              You can hook any external AI model or port agent container. Configure base URLs, keys, name coordinates, and see metrics load directly.
            </p>
          </div>
        </div>
      </aside>

      {/* BACKDROP FOR MOBILE SIDEMENU CLOSE */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* CORE CHAT WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 relative">        {/* DESKTOP GLASS HEADER */}
        <header id="header_glass" className="hidden lg:flex h-16 items-center justify-between px-8 bg-zinc-950/60 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-30 shadow-sm shadow-zinc-950/20">
          <div className="flex items-center gap-3 w-1/3 min-w-0">
            <div className={`w-8 h-8 rounded-lg ${activeColors.bg} flex items-center justify-center shadow-lg ${activeColors.glow} shrink-0`}>
              {renderIcon(activeAgent.iconType, "w-4 h-4 text-white")}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-zinc-100 flex items-center shrink-0">
                  {activeAgent.name} 
                </h1>
                <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded font-mono text-zinc-500 font-semibold border border-zinc-800 shrink-0">
                  {activeAgent.version}
                </span>
                <span className="text-zinc-600 select-none shrink-0">•</span>
                <span className="text-zinc-400 text-xs font-medium truncate">
                  {activeAgent.description}
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Mode Tab Selector */}
          <div className="flex justify-center w-1/3 shrink-0">
            <div className="flex bg-[#0a0a0f] border border-zinc-900 p-1 rounded-xl shadow-inner shadow-black/60">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === 'chat'
                    ? "bg-zinc-900/80 text-violet-400 border border-zinc-800/60 shadow-sm shadow-black/80"
                    : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Console Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? "bg-zinc-900/80 text-violet-400 border border-zinc-800/60 shadow-sm shadow-black/80"
                    : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Metrics Dashboard</span>
              </button>
            </div>
          </div>
 
          <div className="flex items-center justify-end gap-3 w-1/3">
            {activeSessionId && (
              <span className="font-mono text-[9px] bg-zinc-900 border border-zinc-800/85 px-2.5 py-1 rounded text-zinc-500">
                session_id: <span className="text-violet-400">{activeSessionId}</span>
              </span>
            )}

            <button
              id="reset_session_btn"
              onClick={() => initializeAgentSession(activeAgent, true)}
              disabled={sessionLoading || isThinking}
              className="px-4 py-1.5 rounded-full border border-zinc-800 hover:border-violet-500 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 bg-zinc-900/30"
            >
              <RefreshCw className={`w-3 h-3 ${sessionLoading ? 'animate-spin text-violet-400' : ''}`} />
              <span>Reset Chat</span>
            </button>
          </div>
        </header>

        {activeTab === 'chat' ? (
          <>
            {/* MAIN SCROLL VIEWPORT */}
            <main 
              id="scrollable_chat_viewport"
              ref={chatContainerRef}
              className="flex-grow overflow-y-auto px-6 md:px-12 py-24 lg:py-8 space-y-6 max-w-4xl w-full mx-auto"
            >
              {/* Header instructions card in fallback mode */}
              {sessionError && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-zinc-300 text-xs leading-relaxed">
                  <div className="font-semibold text-amber-400 flex items-center mb-1">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Endpoint Handshake Advisory
                  </div>
                  The target URL responded with an error or blocked incoming CORS requests. Standard diagnostic simulation triggers have been activated.
                </div>
              )}

              {/* List of Dialogue messages */}
              <div className="space-y-6 min-h-full">
                <AnimatePresence initial={false}>
                  {activeHistory.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl ${
                          isUser
                            ? activeColors.bubble + ' rounded-tr-none'
                            : 'rounded-tl-none bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-md shadow-black/20'
                        }`}>
                          
                          {/* Avatar badge when robot message is sent */}
                          {!isUser && (
                            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-zinc-800/80">
                              <span className={`w-4 h-4 rounded bg-[#09090b] border ${activeColors.border} flex items-center justify-center shrink-0`}>
                                {renderIcon(activeAgent.iconType, `w-2.5 h-2.5 ${activeColors.text}`)}
                              </span>
                              <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-400">
                                {activeAgent.name} response
                              </span>
                            </div>
                          )}

                          <div className="markdown-body select-text">
                            <Markdown
                              components={{
                                h1: ({ children }) => <h1 className="text-base font-bold text-zinc-100 mt-2 mb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-sm font-bold text-zinc-100 mt-2 mb-1">{children}</h2>,
                                p: ({ children }) => <p className="leading-relaxed text-zinc-300 text-sm whitespace-pre-wrap">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-violet-400">{children}</strong>,
                                code: ({ children, className }) => {
                                  const inline = !className;
                                  return inline ? (
                                    <code className="text-violet-400 bg-violet-950/30 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                                  ) : (
                                    <pre className="bg-black/50 rounded-lg p-3 border border-zinc-800 font-mono text-[11px] text-zinc-350 overflow-x-auto my-2 leading-relaxed">
                                      <code>{children}</code>
                                    </pre>
                                  );
                                },
                                ul: ({ children }) => <ul className="list-disc list-inside text-zinc-300 text-xs space-y-1 my-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside text-zinc-300 text-xs space-y-1 my-1">{children}</ol>,
                                li: ({ children }) => <li className="text-[11px] md:text-xs leading-relaxed">{children}</li>,
                                blockquote: ({ children }) => <blockquote className="border-l-2 border-violet-500 bg-violet-950/25 px-3 py-1.5 my-2 rounded text-zinc-300 text-xs italic">{children}</blockquote>,
                                a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">{children}</a>
                              }}
                            >
                              {msg.text}
                            </Markdown>
                          </div>

                          <div className="mt-2 text-[9px] text-zinc-500 font-mono text-right select-none">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Dynamic thinking bubble with active custom timers */}
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[70%] p-4 rounded-2xl rounded-tl-none bg-zinc-900 border border-zinc-800 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 opacity-40 animate-pulse"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 opacity-70 animate-pulse [animation-delay:0.2s]"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse [animation-delay:0.4s]"></div>
                          <span className="ml-1 text-xs text-zinc-400 font-medium italic">
                            Upstream evaluating.. ({thinkingSeconds}s)
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 leading-relaxed">
                          Awaiting response from portal agent deploy router. Custom containers can take ~10-20 seconds to answer.
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>
            </main>

            {/* INPUT FORM WRAPPER */}
            <footer id="footer_input_wrapper" className="bg-[#07070a]/80 backdrop-blur-md p-6 pt-2 border-t border-zinc-900 flex flex-col items-center sticky bottom-0 z-20">
              <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
                
                {/* Quick action starters based on Agent specific specialties */}
                {!isThinking && activeHistory.length <= 1 && (
                  <div className="flex flex-wrap gap-2 justify-center pb-1">
                    {quickPrompts.map((promptText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInputValue(promptText)}
                        className="text-xs bg-zinc-900/60 hover:bg-zinc-850 hover:border-violet-500/50 text-zinc-400 hover:text-violet-200 px-3 py-1.5 rounded-xl border border-zinc-850 transition-all cursor-pointer active:scale-95"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Form Fields */}
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex items-center w-full">
                  <input
                    id="user_chat_input"
                    type="text"
                    autoComplete="off"
                    placeholder={sessionLoading ? `Spinning up environment for ${activeAgent.name}...` : `Send command payload to ${activeAgent.name}...`}
                    disabled={sessionLoading || isThinking}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-6 pr-16 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-zinc-650 text-zinc-100 disabled:opacity-50 ${activeColors.focus}`}
                  />

                  <div className="absolute right-3 flex items-center gap-2">
                    <button
                      id="submit_message_btn"
                      type="submit"
                      disabled={!inputValue.trim() || isThinking || sessionLoading}
                      className="p-2.5 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 hover:shadow-violet-500/50 transition-all disabled:bg-zinc-850 disabled:text-zinc-500 disabled:shadow-none cursor-pointer active:scale-95"
                      title="Send payload"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Status indicators */}
                <div className="mt-2 flex flex-wrap justify-between items-center gap-2 text-[10px] text-zinc-500 font-mono select-none uppercase tracking-widest px-2">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-zinc-650" />
                    Endpoint: <span className="text-zinc-400 font-sans tracking-normal capitalize truncate max-w-[200px]">{activeAgent.baseUrl}</span>
                  </span>
                  <div className="flex items-center gap-4">
                    <span>App: <strong className="text-zinc-400">{activeAgent.appName}</strong></span>
                    <span className="hidden sm:inline">User ID: <strong className="text-zinc-400">{activeAgent.userId}</strong></span>
                  </div>
                </div>

              </div>
            </footer>
          </>
        ) : (
          <div className="flex-grow overflow-y-auto px-4 py-28 lg:py-6 relative z-10 w-full">
            <AnalyticsDashboard
              baseUrl="https://myanalyticsagent-jun-1008791897094.us-east1.run.app"
              appName={activeAgent.appName}
              activeColor={activeColors.text}
            />
          </div>
        )}
      </div>

      {/* CHASM / MODAL OVERLAY: DEPLOY / REGISTER NEW AGENT FORM */}
      <AnimatePresence>
        {isRegistering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark glass backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegistering(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-2xl shadow-xl z-10 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-sky-650/10 border border-sky-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                  </div>
                  <h3 className="font-bold text-sm tracking-wide text-zinc-100 uppercase">Deploy / Register Agent</h3>
                </div>
                <button
                  onClick={() => setIsRegistering(false)}
                  className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleRegisterNewAgent} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Agent Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Agent Sierra"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500/80 text-zinc-200"
                    />
                  </div>

                  {/* Version Tag */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Version Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. v1.0.0"
                      value={newAgent.version}
                      onChange={(e) => setNewAgent({ ...newAgent, version: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500/80 text-zinc-200"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Functional Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Code syntax compiler and advice operator."
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500/80 text-zinc-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* App Name parameter */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">App ID/Name Variable</label>
                    <input
                      type="text"
                      placeholder="e.g. app"
                      value={newAgent.appName}
                      onChange={(e) => setNewAgent({ ...newAgent, appName: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500/80 text-zinc-250 font-mono"
                    />
                  </div>

                  {/* User ID parameter */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Target User ID</label>
                    <input
                      type="text"
                      placeholder="e.g. web-user-01"
                      value={newAgent.userId}
                      onChange={(e) => setNewAgent({ ...newAgent, userId: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500/80 text-zinc-250 font-mono"
                    />
                  </div>
                </div>

                {/* Base URL Endpoint */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Base API URL Endpoint *</label>
                    <button
                      type="button"
                      onClick={() => setNewAgent({ ...newAgent, baseUrl: "https://myportagent-jun-1008791897094.us-east1.run.app" })}
                      className="text-[9px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Use default backing URL
                    </button>
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={newAgent.baseUrl}
                    onChange={(e) => setNewAgent({ ...newAgent, baseUrl: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500/80 text-zinc-200 font-mono"
                  />
                </div>

                {/* Visual selectors: Icon and Color Accent theme properties */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Icon Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Avatar Motif</label>
                    <div className="flex flex-wrap gap-2">
                      {(['cpu', 'sparkles', 'terminal', 'database', 'code', 'shield'] as const).map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setNewAgent({ ...newAgent, iconType: ic })}
                          className={`p-2 rounded bg-zinc-900 border text-zinc-400 hover:text-zinc-200 ${
                            newAgent.iconType === ic ? "border-violet-500/60 bg-violet-950/20 text-violet-300" : "border-zinc-800/80"
                          }`}
                        >
                          {renderIcon(ic, "w-4 h-4 text-current")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block font-sans">Visual Color Accent</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(colorMap).map((colorName) => {
                        const style = colorMap[colorName];
                        const isSelected = newAgent.accentColor === colorName;
                        return (
                          <button
                            key={colorName}
                            type="button"
                            onClick={() => setNewAgent({ ...newAgent, accentColor: colorName })}
                            className={`w-6 h-6 rounded-full ${style.bg} relative flex items-center justify-center transition-all cursor-pointer`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Buttons block */}
                <div className="pt-4 flex items-center gap-2 justify-end border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-lg shadow-violet-600/20 cursor-pointer"
                  >
                    <span>Deploy Agent</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

