import React, { useState, useEffect } from 'react';
import { User, Search, Gift, Heart, AlertTriangle, SkipForward, ArrowRight, BookOpen, Sparkles, Loader2, X, ChevronDown, Play, FileText } from 'lucide-react';

// --- Gemini API Logic ---

const callGemini = async (prompt, systemInstruction = "") => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
  
  if (!apiKey) {
    console.warn("Missing Gemini API Key");
    return "請設定 VITE_GEMINI_API_KEY 環境變數以啟用 AI 功能。";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  let attempt = 0;
  const maxRetries = 3;
  const delays = [1000, 2000, 4000];

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "無法獲取回應，請稍後再試。";
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries - 1) return `連線錯誤: ${error.message}`;
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      attempt++;
    }
  }
};

// --- Main App Component ---

const Game = ({ gameData, activeScriptMeta, onBack }) => {
  // Initialize Game State
  const [currentSceneId, setCurrentSceneId] = useState('INTRO');
  const [inventory, setInventory] = useState(['video']); 
  const [showItemAlert, setShowItemAlert] = useState(null);
  
  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiModalContent, setAiModalContent] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiDiscussion, setAiDiscussion] = useState(null);

  // Text Paging State
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [displayContent, setDisplayContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const skipTypingRef = React.useRef(false);

  // Destructure Data
  const { scenes, items, characters } = gameData;
  const scene = scenes[currentSceneId];

  // Helper Wrappers for Game Logic
  // Fallback for safety if scene is missing (shouldn't happen if JSON is valid)
  if (!scene) {
    return <div className="text-white p-10">Error: Scene {currentSceneId} not found</div>;
  }

  // Memoize textSegments to avoid recalculating on every render
  const textSegments = React.useMemo(() => {
    return scene.text.split('\n\n');
  }, [scene.text]);

  const isLastSegment = segmentIndex >= textSegments.length - 1;
  const currentFullText = textSegments[segmentIndex] || '';
  const isFinishedTyping = !isTyping && displayContent === currentFullText;
  const canAct = isLastSegment && isFinishedTyping;

  const checkRequirement = (req) => {
    if (!req) return true;
    const requirements = req.split(',').map(r => r.trim());
    return requirements.every(r => inventory.includes(r));
  };

  const handleChoice = (choice) => {
    // Handle Item Acquisition
    if (choice.getItem && !inventory.includes(choice.getItem)) {
      setInventory(prev => [...prev, choice.getItem]);
      const itemInfo = Object.values(items).find(item => item.id === choice.getItem);
      if (itemInfo) {
        setShowItemAlert(itemInfo.name);
        setTimeout(() => setShowItemAlert(null), 3000);
      }
    }

    // Navigation
    if (choice.next) {
      setCurrentSceneId(choice.next);
    } else if (choice.action) {
      setCurrentSceneId(choice.action.toUpperCase());
    }
  };

  // Text Paging Logic
  useEffect(() => {
    setSegmentIndex(0);
    setDisplayContent('');
    setIsTyping(true);
    setAiDiscussion(null);
    skipTypingRef.current = false;
  }, [currentSceneId]);

  useEffect(() => {
    const fullText = textSegments[segmentIndex] || '';
    if (!fullText) {
      setIsTyping(false);
      return;
    }

    skipTypingRef.current = false;
    setDisplayContent('');
    setIsTyping(true);
    let i = 0;
    const intervalId = setInterval(() => {
      if (skipTypingRef.current) {
        setDisplayContent(fullText);
        setIsTyping(false);
        clearInterval(intervalId);
        return;
      }
      i++;
      setDisplayContent(fullText.slice(0, i));
      if (i >= fullText.length) {
        setIsTyping(false);
        clearInterval(intervalId);
      }
    }, 30);
    return () => clearInterval(intervalId);
  }, [segmentIndex, textSegments]);

  const handleTextClick = () => {
    const fullText = textSegments[segmentIndex] || '';
    if (isTyping) {
      skipTypingRef.current = true;
      setDisplayContent(fullText);
      setIsTyping(false);
    } else if (segmentIndex < textSegments.length - 1) {
      setSegmentIndex(prev => prev + 1);
    }
  };

  // Restart
  const restartGame = () => {
    setCurrentSceneId('INTRO');
    setInventory(['video']); 
    setShowItemAlert(null);
    setAiDiscussion(null);
  };

  // Gemini logic
  const handlePrayForWisdom = async () => {
    setIsAiLoading(true);
    setIsAiModalOpen(true);
    setAiModalContent(null);

    const systemPrompt = "你是一位充滿智慧、溫柔且堅定的基督徒屬靈導師。你的任務是幫助一個正面臨信仰挑戰的年輕人。請提供簡短、鼓勵性的建議（不超過60字），並附上一句相關的聖經經文。";
    const userPrompt = `目前情境：[劇本：${activeScriptMeta.title}] ${scene.text}\n\n玩家正面臨挑戰。請給他一個屬靈的看見或提示，幫助他平靜下來，不要直接告訴他選哪個選項，而是引導他的心態。`;

    const result = await callGemini(userPrompt, systemPrompt);
    setAiModalContent(result);
    setIsAiLoading(false);
  };

  const handleGenerateDiscussion = async () => {
    setIsAiLoading(true);
    const systemPrompt = "你是一位擅長帶領小組討論的牧者。請根據玩家在遊戲中達成的結局，設計 3 個適合教會社青小組討論的問題。問題要引導反思信仰與文化的衝突，以及如何更有智慧地做見證。";
    const userPrompt = `劇本：${activeScriptMeta.title}\n玩家達成的結局：${scene.title}\n結局描述：${scene.text}\n\n請生成 3 個討論問題，格式為條列式。`;
    const result = await callGemini(userPrompt, systemPrompt);
    setAiDiscussion(result);
    setIsAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-red-500 selection:text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-red-900/80 p-4 flex justify-between items-center border-b border-red-800 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="mr-2 hover:bg-red-800 p-1 rounded transition-colors text-red-200" title="回到選單">
               <ArrowRight className="rotate-180" size={16} />
            </button>
            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">劇本</span>
            <h1 className="font-bold text-lg tracking-wider">{activeScriptMeta.title}</h1>
          </div>
          
          {!currentSceneId.includes('END') && !['INTRO', 'CHAR_SELECT'].includes(currentSceneId) && (
            <button 
              onClick={handlePrayForWisdom}
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full transition-colors shadow-lg shadow-indigo-500/20 border border-indigo-400/50"
            >
              <Sparkles size={12} />
              <span>禱告求智慧</span>
            </button>
          )}
        </div>

        {/* AI Modal */}
        {isAiModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 max-w-sm w-full shadow-2xl relative">
              <button onClick={() => setIsAiModalOpen(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X size={20} /></button>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="bg-indigo-900/50 p-3 rounded-full text-indigo-300"><Sparkles size={32} /></div>
                <h3 className="text-xl font-bold text-indigo-300">來自聖靈的感動</h3>
                {isAiLoading ? (
                  <div className="flex flex-col items-center py-4 text-slate-400"><Loader2 className="animate-spin mb-2" /><span className="text-xs">正在尋求話語...</span></div>
                ) : (
                  <div className="text-slate-200 leading-relaxed text-sm bg-slate-900/50 p-4 rounded-lg border border-slate-700">{aiModalContent}</div>
                )}
                <button onClick={() => setIsAiModalOpen(false)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-bold mt-2">阿們 (關閉)</button>
              </div>
            </div>
          </div>
        )}

        {/* Item Alert */}
        {showItemAlert && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-bounce flex items-center gap-2">
            <Gift size={16} />獲得線索：{showItemAlert}
          </div>
        )}

        {/* Character Intro */}
        {scene.type === 'character_intro' ? (
          <div className="flex-1 p-6 bg-slate-800 overflow-y-auto">
             <h2 className="text-xl font-bold mb-4 text-center text-yellow-500">人物檔案</h2>
             <div className="grid gap-4 pb-6">
               {characters.map((char) => (
                 <div key={char.id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex gap-4 items-start">
                   <div className={`p-3 rounded-full shrink-0 ${char.id === 'ENO' ? 'bg-blue-900/50 text-blue-400' : char.id === 'UNCLE' ? 'bg-red-900/50 text-red-400' : 'bg-slate-600 text-slate-300'}`}><User size={24} /></div>
                   <div>
                     <div className="flex items-baseline gap-2">
                       <h3 className="font-bold text-lg text-slate-200">{char.name}</h3>
                       <span className="text-xs text-slate-400 uppercase border border-slate-500 px-1 rounded">{char.role}</span>
                     </div>
                     <p className="text-sm text-slate-300 mt-1 leading-relaxed">{char.desc}</p>
                   </div>
                 </div>
               ))}
             </div>
             <div className="mt-auto pt-4 border-t border-slate-700">
                {scene.options.map((opt, idx) => (
                  <button key={idx} onClick={() => handleChoice(opt)} className="w-full p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold">{opt.text}</button>
                ))}
             </div>
          </div>
        ) : (
          /* Main Game Area */
          <>
            {/* Visual Area */}
            <div className={`shrink-0 h-48 sm:h-64 flex flex-col items-center justify-center p-6 text-center relative transition-colors duration-1000 ${scene.color || 'bg-slate-900'}`}>
              <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center items-center">
                 <div className="w-64 h-64 rounded-full border-4 border-red-500/20 animate-pulse"></div>
              </div>
              <div className="relative z-10 transform transition-all duration-500 hover:scale-110">
                 {currentSceneId.includes('END') ? <div className="text-6xl">🏁</div> : 
                  currentSceneId === 'INTRO' ? <div className="text-slate-400 p-4 bg-slate-800 rounded-full"><BookOpen size={48} /></div> :
                  currentSceneId === 'TALK_MOM' ? <div className="text-pink-400 p-4 bg-pink-900/30 rounded-full"><Heart size={48} /></div> :
                  currentSceneId === 'TALK_XUAN' ? <div className="text-purple-400 p-4 bg-purple-900/30 rounded-full"><Search size={48} /></div> :
                  currentSceneId === 'RECALL_GRANDPA' ? <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-full"><Gift size={48} /></div> :
                  <div className="text-red-500 p-4 bg-red-900/20 rounded-full"><AlertTriangle size={48} /></div>}
              </div>
            </div>

            {/* Text Box Area */}
            <div 
              className="flex-1 bg-black/40 backdrop-blur-md p-6 border-y border-white/10 relative cursor-pointer hover:bg-black/50 transition-colors flex flex-col"
              onClick={handleTextClick}
            >
              <h2 className="text-yellow-500 font-bold mb-3 text-sm uppercase tracking-widest flex justify-between">
                <span>{scene.title || '劇情推進'}</span>
                <span className="text-slate-500 text-xs normal-case">{segmentIndex + 1} / {textSegments.length}</span>
              </h2>
              
              <p className="text-lg leading-relaxed whitespace-pre-wrap text-slate-200 min-h-[4rem]">
                {displayContent}
                {isTyping && <span className="inline-block w-2 h-5 bg-yellow-500 ml-1 animate-pulse align-middle"></span>}
              </p>

              {/* Next Indicator */}
              <div className="mt-auto pt-4 flex justify-center h-6">
                {!isTyping && !isLastSegment && (
                   <div className="animate-bounce text-yellow-500 flex flex-col items-center text-xs opacity-80">
                     <ChevronDown size={16} />
                     <span>點擊繼續</span>
                   </div>
                )}
                {isLastSegment && !isTyping && !canAct && (
                   <span className="text-slate-500 text-xs">劇情結束，請選擇行動</span>
                )}
              </div>
            </div>

            {/* Inventory Bar */}
            {!['INTRO', 'CHAR_SELECT'].includes(currentSceneId) && (
              <div className="bg-slate-950 p-3 flex gap-4 overflow-x-auto border-y border-slate-700 items-center shrink-0">
                <span className="text-xs text-slate-500 uppercase tracking-widest shrink-0">背包物品</span>
                {Object.values(items).map(item => (
                  <div key={item.id} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-all ${inventory.includes(item.id) ? 'bg-indigo-900 text-indigo-200 border border-indigo-500/50' : 'opacity-0 hidden'}`}>
                    <Gift size={12} />{item.name}
                  </div>
                ))}
                {inventory.length <= 1 && <span className="text-xs text-slate-600 italic">暫無搜集到關鍵線索...</span>}
              </div>
            )}

            {/* Action Area */}
            <div className={`p-6 bg-slate-800 transition-all duration-500 ${canAct ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <div className="grid gap-3">
                {scene.type === 'investigation' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scene.choices.map((choice, idx) => {
                      const isTaken = (choice.action === 'talk_mom' && inventory.includes('incense')) ||
                                      (choice.action === 'talk_xuan' && inventory.includes('debt')) ||
                                      (choice.action === 'recall_grandpa' && inventory.includes('lung'));
                      
                      if (isTaken) return <button key={idx} disabled className="p-3 rounded border border-slate-700 bg-slate-700/50 text-slate-500 text-sm flex items-center justify-center gap-2 cursor-not-allowed"><span>已探索</span></button>;
                      return (
                        <button key={idx} onClick={() => handleChoice(choice)} className={`p-4 rounded border text-left transition-all flex items-center gap-3 ${choice.style === 'primary' ? 'col-span-1 sm:col-span-2 bg-red-600 border-red-500 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] justify-center font-bold text-lg' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500'}`}>
                          {choice.style !== 'primary' && <Search size={16} />}{choice.text}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {scene.options && scene.options.map((opt, idx) => (
                      <button key={idx} onClick={() => handleChoice(opt)} className="w-full p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold transition-colors flex items-center justify-center gap-2">{opt.text} <ArrowRight size={18} /></button>
                    ))}
                    {scene.choices && scene.choices.map((choice, idx) => {
                      const locked = choice.req && !checkRequirement(choice.req);
                      return (
                        <button key={idx} onClick={() => !locked && handleChoice(choice)} disabled={locked} className={`w-full p-4 rounded text-left border transition-all relative overflow-hidden group ${locked ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-60' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500 text-slate-200'} ${choice.next === 'END_GOOD' && !locked ? 'ring-2 ring-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : ''}`}>
                          <div className="flex justify-between items-center"><span className="font-semibold">{choice.text}</span>{locked && <span className="text-xs border border-slate-700 px-2 py-1 rounded text-slate-500">缺少關鍵線索</span>}</div>
                          {locked && choice.next === 'END_GOOD' && <div className="text-xs mt-1 text-slate-600">提示：需要找出阿公的秘密以及準備好的禮物</div>}
                        </button>
                      )
                    })}
                  </>
                )}
              </div>

              {currentSceneId.includes('END') && (
                <div className="mt-6 flex flex-col gap-4">
                  <div className="text-center text-sm text-slate-400">評分: <span className={`font-bold text-lg ${scene.score >= 80 ? 'text-green-400' : scene.score < 50 ? 'text-red-400' : 'text-yellow-400'}`}>{scene.score} / 100</span></div>
                  {!aiDiscussion ? (
                    <button onClick={handleGenerateDiscussion} disabled={isAiLoading} className="w-full py-3 bg-purple-600/20 border border-purple-500/50 text-purple-200 hover:bg-purple-600/40 rounded flex items-center justify-center gap-2 transition-all">{isAiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}{isAiLoading ? "生成中..." : "生成小組討論題目 (AI)"}</button>
                  ) : (
                    <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg text-left"><h3 className="text-purple-300 font-bold mb-2 flex items-center gap-2"><Sparkles size={16} /> 牧者回應與討論：</h3><div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{aiDiscussion}</div></div>
                  )}
                  <button onClick={restartGame} className="w-full py-3 border border-slate-600 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"><SkipForward size={16} /> 重新挑戰 (嘗試解鎖其他結局)</button>
                  <button onClick={onBack} className="w-full py-3 border border-yellow-800/50 rounded text-yellow-500 hover:bg-yellow-900/20 transition-colors flex items-center justify-center gap-2 mt-2">回到劇本選單</button>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Footer */}
        <div className="bg-slate-900 p-2 text-center text-xs text-slate-600 border-t border-slate-800 shrink-0">Designed for Christian Study Group Discussion • Powered by Gemini AI</div>
      </div>
    </div>
  );
};

export default function App() {
  // Script Management
  const [availableScripts, setAvailableScripts] = useState([]);
  const [activeScriptMeta, setActiveScriptMeta] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [isLoadingScripts, setIsLoadingScripts] = useState(true);

  // Load script list on mount
  useEffect(() => {
    fetch('/scripts/index.json')
      .then(res => res.json())
      .then(data => {
        setAvailableScripts(data);
        setIsLoadingScripts(false);
      })
      .catch(err => {
        console.error("Failed to load scripts:", err);
        setIsLoadingScripts(false);
      });
  }, []);

  const loadScript = async (scriptMeta) => {
    setIsLoadingScripts(true);
    try {
      const res = await fetch(`/scripts/${scriptMeta.id}.json`);
      const data = await res.json();
      setGameData(data);
      setActiveScriptMeta(scriptMeta);
    } catch (err) {
      console.error("Failed to load script details:", err);
      alert("載入劇本失敗，請稍後再試。");
    } finally {
      setIsLoadingScripts(false);
    }
  };

  const backToMenu = () => {
    setGameData(null);
    setActiveScriptMeta(null);
  };

  if (!gameData) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-red-500 mb-2">劇本殺：信仰與人生</h1>
            <p className="text-slate-400">選擇一個劇本開始你的旅程</p>
          </header>

          {isLoadingScripts ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-indigo-500" size={48} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableScripts.map(script => (
                <button 
                  key={script.id}
                  onClick={() => loadScript(script)}
                  className="bg-slate-800 border border-slate-700 hover:border-indigo-500 hover:bg-slate-800/80 p-6 rounded-xl text-left transition-all group flex flex-col gap-4 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10"
                >
                  <div className="flex items-start justify-between w-full">
                     <div className="bg-indigo-900/50 p-3 rounded-lg text-indigo-400 group-hover:text-indigo-300 transition-colors">
                       <FileText size={24} />
                     </div>
                     <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">單人劇本</span>
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-yellow-400 transition-colors">{script.title}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">{script.description}</p>
                  </div>

                  <div className="mt-auto pt-4 flex items-center text-indigo-400 text-sm font-bold gap-1 group-hover:gap-2 transition-all">
                    開始體驗 <ArrowRight size={16} />
                  </div>
                </button>
              ))}
              
              {availableScripts.length === 0 && (
                <div className="col-span-full text-center p-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 text-slate-500">
                  <div className="flex justify-center mb-4"><AlertTriangle size={32} /></div>
                  <p>目前沒有可用的劇本。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <Game gameData={gameData} activeScriptMeta={activeScriptMeta} onBack={backToMenu} />;
}
