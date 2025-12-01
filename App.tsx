import React, { useState, useRef, useEffect } from 'react';
import { AppState, StudyConfig, KnowledgeNode, ChatMessage, PartnerMood, StudyMaterial } from './types';
import { digestMaterial, chatWithPartner, generateQuizQuestion, initChatSession } from './services/geminiService';
import MindMap from './components/MindMap';
import PartnerAvatar from './components/PartnerAvatar';
import { BookOpen, Clock, Send, Brain, Upload, Sparkles, Play, StopCircle, FileText, X, FileIcon, Pause, Video, GripHorizontal } from 'lucide-react';

// Setup Component
const SetupView = ({ onStart }: { onStart: (config: StudyConfig) => void }) => {
  const [config, setConfig] = useState<StudyConfig>({
    partnerName: 'Alice',
    partnerImage: null,
    partnerVideo: null,
    iqLevel: 120,
    personality: 'Supportive, slightly strict but encouraging',
    studyDurationMinutes: 60,
    materials: []
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setConfig(prev => ({ ...prev, partnerImage: ev.target?.result as string, partnerVideo: null }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const videoUrl = URL.createObjectURL(file);
      setConfig(prev => ({ ...prev, partnerVideo: videoUrl, partnerImage: null }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newMaterials: StudyMaterial[] = [];
      setIsProcessing(true);

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        try {
          const content = await fileToBase64(file);
          // Default to PDF if mimeType is empty (common in some browsers/drag-drop for certain file types)
          const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain');
          
          newMaterials.push({
            id: Date.now().toString() + i,
            name: file.name,
            type: 'file',
            mimeType: mimeType,
            content: content
          });
        } catch (err) {
          console.error("Error reading file", file.name, err);
        }
      }

      setConfig(prev => ({
        ...prev,
        materials: [...prev.materials, ...newMaterials]
      }));
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove "data:*/*;base64," prefix for API usage
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const removeMaterial = (id: string) => {
    setConfig(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== id)
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-5xl w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-purple-400 mb-2">
            One Night Understand
          </h1>
          <p className="text-slate-400">Configure your ideal study partner and upload your materials.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Partner Settings */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" /> Partner Persona
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Name</label>
              <input 
                type="text" 
                value={config.partnerName}
                onChange={e => setConfig({...config, partnerName: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Appearance (Image or Video)</label>
              <div className="flex flex-col gap-4">
                <div className="w-full h-40 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-600 flex items-center justify-center relative group">
                  {config.partnerVideo ? (
                    <video src={config.partnerVideo} className="w-full h-full object-cover" autoPlay loop muted />
                  ) : config.partnerImage ? (
                    <img src={config.partnerImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-600 flex flex-col items-center">
                       <Sparkles className="w-8 h-8 mb-2 opacity-50"/>
                       <span>No Avatar Selected</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-sky-400 px-4 py-2 rounded-lg border border-slate-700 transition-colors text-sm text-center flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4"/> Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-purple-400 px-4 py-2 rounded-lg border border-slate-700 transition-colors text-sm text-center flex items-center justify-center gap-2">
                    <Video className="w-4 h-4"/> Video
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex justify-between">
                <span>IQ Level</span>
                <span className="text-sky-400 font-mono">{config.iqLevel}</span>
              </label>
              <input 
                type="range" 
                min="80" 
                max="180" 
                value={config.iqLevel} 
                onChange={e => setConfig({...config, iqLevel: parseInt(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Personality Prompt</label>
              <textarea 
                value={config.personality}
                onChange={e => setConfig({...config, personality: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm h-20 resize-none focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Study Material */}
          <div className="space-y-6 flex flex-col">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" /> Material & Goal
            </h2>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Duration (Minutes)</label>
              <input 
                type="number" 
                value={config.studyDurationMinutes}
                onChange={e => setConfig({...config, studyDurationMinutes: parseInt(e.target.value)})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <label className="text-sm text-slate-400">Study Materials</label>
              
              <label className="flex-1 min-h-[160px] border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-sky-500 hover:bg-slate-800/50 transition-all group">
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-sky-400 mb-2 transition-colors" />
                <span className="text-slate-400 group-hover:text-sky-300 text-sm font-medium">Click to upload files</span>
                <span className="text-slate-600 text-xs mt-1">PDF, DOCX, TXT (Max 3-4 large files)</span>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,.docx,.txt,.md,.json" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>

              {config.materials.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {config.materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileIcon className="w-4 h-4 text-sky-500 flex-shrink-0" />
                        <span className="text-xs text-white truncate">{m.name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-1 rounded uppercase">{m.mimeType.split('/')[1] || 'FILE'}</span>
                      </div>
                      <button onClick={() => removeMaterial(m.id)} className="text-slate-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => onStart(config)}
            disabled={config.materials.length === 0 || isProcessing}
            className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-sky-600 font-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : config.materials.length > 0 ? (
              <>Start Session <Play className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
            ) : (
              "Add Material to Start"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>(AppState.SETUP);
  const [config, setConfig] = useState<StudyConfig | null>(null);
  const [mindMap, setMindMap] = useState<KnowledgeNode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [partnerMood, setPartnerMood] = useState<PartnerMood>(PartnerMood.NEUTRAL);
  const [isTalking, setIsTalking] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string>('root');
  
  // Timer & Control state
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const initializeSession = async (cfg: StudyConfig) => {
    setConfig(cfg);
    setState(AppState.PROCESSING);
    
    const map = await digestMaterial(cfg.materials, cfg.studyDurationMinutes);
    setMindMap(map);
    setTimeLeft(cfg.studyDurationMinutes * 60);

    await initChatSession(cfg.materials, cfg, map.name);

    const initialGreeting: ChatMessage = {
      id: 'init',
      sender: 'partner',
      text: `Hi! I'm ${cfg.partnerName}. I've read through your documents. The main topic seems to be "${map.name}". I've mapped it out below. Ready to dive in?`,
      timestamp: Date.now(),
      type: 'text'
    };
    setMessages([initialGreeting]);
    setState(AppState.STUDYING);
  };

  // Timer Effect
  useEffect(() => {
    if (state === AppState.STUDYING && timeLeft > 0 && !isPaused) {
      const interval = window.setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timeLeft === 0 && state === AppState.STUDYING) {
      setState(AppState.FINISHED);
    }
  }, [state, timeLeft, isPaused]);

  // Chat Handler
  const handleSendMessage = async () => {
    if (!input.trim() || !config || !mindMap || isPaused) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTalking(true);
    setPartnerMood(PartnerMood.THINKING);

    const responseText = await chatWithPartner(userMsg.text);
    
    setIsTalking(false);
    setPartnerMood(PartnerMood.HAPPY); 

    const partnerMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'partner',
      text: responseText,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, partnerMsg]);
  };

  const handleQuizAnswer = (isCorrect: boolean) => {
     if (!config || isPaused) return;
     const text = isCorrect ? "That's correct! Well done." : "Not quite. Let's review that.";
     const msg: ChatMessage = {
       id: Date.now().toString(),
       sender: 'partner',
       text,
       timestamp: Date.now()
     };
     setMessages(prev => [...prev, msg]);
  };

  const generateQuiz = async () => {
    if(!config || !mindMap || isPaused) return;
    setPartnerMood(PartnerMood.THINKING);
    const topic = mindMap.name; 
    const quizMsg = await generateQuizQuestion(topic, config.iqLevel);
    setMessages(prev => [...prev, quizMsg]);
    setPartnerMood(PartnerMood.NEUTRAL);
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const togglePause = () => setIsPaused(!isPaused);

  if (state === AppState.SETUP) {
    return <SetupView onStart={initializeSession} />;
  }

  if (state === AppState.PROCESSING) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white">
        <Brain className="w-16 h-16 text-sky-500 animate-pulse mb-4" />
        <h2 className="text-2xl font-bold">Digesting {config?.materials.length} Documents...</h2>
        <p className="text-slate-400 mt-2">Creating your knowledge map.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 flex-none border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-sky-500" />
          <span className="font-bold text-lg hidden sm:block">One Night Understand</span>
          {isPaused && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">PAUSED</span>}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={togglePause}
            className={`p-2 rounded-full transition-colors ${isPaused ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
          </button>
          
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            <Clock className={`w-4 h-4 ${timeLeft < 600 ? 'text-red-400' : 'text-sky-400'}`} />
            <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
          </div>

          <button onClick={() => setState(AppState.SETUP)} className="text-slate-500 hover:text-red-400 transition-colors">
            <StopCircle className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content Vertical Stack */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* 1. Partner Avatar Section (Resizable) */}
        <div className="relative resize-y overflow-hidden min-h-[25vh] max-h-[70vh] flex-none bg-black border-b border-slate-800" style={{ height: '40vh' }}>
          <PartnerAvatar 
            imageSrc={config?.partnerImage || null} 
            videoSrc={config?.partnerVideo || null}
            mood={partnerMood} 
            isTalking={isTalking} 
            isPaused={isPaused}
          />
          {/* Resize Handle Overlay Hint */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/20 pointer-events-none">
             <GripHorizontal className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Content Area (Notes & Chat) */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900">
            
            {/* Mind Map Section */}
            <div className="flex-1 min-h-[200px] border-b border-slate-800 relative">
               <div className="absolute top-2 left-2 z-10 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-slate-400 border border-slate-700 pointer-events-none">
                  Knowledge Map
               </div>
               <MindMap data={mindMap} currentProcessId={currentNodeId} />
               <div className="absolute bottom-4 right-4 z-10">
                 <button onClick={generateQuiz} disabled={isPaused} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Ask Quiz
                 </button>
               </div>
            </div>

            {/* Chat Section */}
            <div className="h-[35vh] flex flex-col bg-slate-950/50">
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[85%] rounded-2xl px-4 py-3 text-sm
                        ${msg.sender === 'user' 
                          ? 'bg-sky-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}
                      `}>
                        {msg.type === 'quiz' ? (
                           <div className="space-y-3">
                              <p className="font-semibold text-yellow-400">Quiz Time!</p>
                              <p>{msg.text}</p>
                              <div className="grid grid-cols-1 gap-2 mt-2">
                                 {msg.quizOptions?.map((opt, idx) => (
                                   <button 
                                     key={idx}
                                     onClick={() => handleQuizAnswer(idx === msg.correctAnswer)}
                                     disabled={isPaused}
                                     className="text-left text-xs bg-slate-700 hover:bg-slate-600 p-2 rounded transition-colors disabled:opacity-50"
                                   >
                                     {String.fromCharCode(65 + idx)}. {opt}
                                   </button>
                                 ))}
                              </div>
                           </div>
                        ) : (
                          <p>{msg.text}</p>
                        )}
                        <span className="text-[10px] opacity-50 block mt-1 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))}
               </div>
               
               <div className="p-3 bg-slate-900 border-t border-slate-800">
                 <div className="flex gap-2 relative">
                   <input 
                     type="text" 
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                     disabled={isPaused}
                     placeholder={isPaused ? "Session Paused" : `Chat with ${config?.partnerName}...`}
                     className="flex-1 bg-slate-800 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 border border-slate-700 placeholder-slate-500 disabled:opacity-50"
                   />
                   <button 
                     onClick={handleSendMessage}
                     disabled={!input.trim() || isPaused}
                     className="bg-sky-600 hover:bg-sky-500 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <Send className="w-5 h-5" />
                   </button>
                 </div>
               </div>
            </div>

        </div>

      </div>
    </div>
  );
}