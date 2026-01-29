
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- Constants ---
const TOTEMS = ['🐱', '🐶', '🐑', '🐄', '1', '2', '3', '4'];
const TOP_CELLS_COUNT = 8;
const BOTTOM_CELLS_COUNT = 4;
const SESSION_DURATION = 120; 

type GameState = 'IDLE' | 'MEMORIZING' | 'PLAYING' | 'ROUND_RESULT' | 'FINAL_SUMMARY';

interface CellData {
  id: number;
  totem: string | null;
  isHidden: boolean;
}

const TotemGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [round, setRound] = useState(1);
  const [topCells, setTopCells] = useState<CellData[]>([]);
  const [interactionCells, setInteractionCells] = useState<(string | null)[]>(new Array(BOTTOM_CELLS_COUNT).fill(null));
  const [targets, setTargets] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('totem-high-score')) || 0);
  
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(100);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_DURATION);
  
  const [totalMemorizeTime, setTotalMemorizeTime] = useState(0);
  const memorizeStartRef = useRef<number>(0);

  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('totem-sound') !== 'off');
  const [baseMemoryTime, setBaseMemoryTime] = useState(() => Number(localStorage.getItem('totem-base-time')) || 15);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [showPoster, setShowPoster] = useState(false);
  const [lastRoundCorrect, setLastRoundCorrect] = useState<boolean | null>(null);
  
  const phaseTimerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('totem-sound', soundEnabled ? 'on' : 'off');
    localStorage.setItem('totem-base-time', baseMemoryTime.toString());
  }, [soundEnabled, baseMemoryTime]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'click' | 'success' | 'fail' | 'start' | 'timeout' | 'ready') => {
    if (!soundEnabled || !audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    const now = audioCtxRef.current.currentTime;

    if (type === 'click') {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'start') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'timeout') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.5);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'ready') {
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  };

  const endSession = useCallback(() => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    playSound('timeout');
    setGameState('FINAL_SUMMARY');
  }, []);

  const startSessionTimer = () => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    setSessionTimeLeft(SESSION_DURATION);
    sessionTimerRef.current = window.setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const initRound = useCallback((isNewSession: boolean) => {
    initAudio();
    if (isNewSession) {
      setRound(1);
      setScore(0);
      setTotalMemorizeTime(0);
      startSessionTimer();
      playSound('start');
    }
    const shuffled = [...TOTEMS].sort(() => Math.random() - 0.5);
    const initialTop = Array.from({ length: TOP_CELLS_COUNT }, (_, i) => ({
      id: i,
      totem: shuffled[i],
      isHidden: false,
    }));
    const chosenTargets = [...shuffled].sort(() => Math.random() - 0.5).slice(0, 4);
    
    setTopCells(initialTop);
    setInteractionCells(new Array(BOTTOM_CELLS_COUNT).fill(null));
    setTargets(chosenTargets);
    setLastRoundCorrect(null);
    setSelectedSourceIndex(null);
    setPhaseTimeLeft(100);
    setGameState('MEMORIZING');
    memorizeStartRef.current = Date.now();
  }, [baseMemoryTime]);

  useEffect(() => {
    if (gameState === 'MEMORIZING') {
      const initialMs = baseMemoryTime * 1000;
      const reduction = (round - 1) * 300; 
      const duration = Math.max(initialMs * 0.4, initialMs - reduction);
      const startTime = Date.now();
      phaseTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setPhaseTimeLeft(remaining);
        if (remaining <= 0) {
          handleFinishedMemorizing();
        }
      }, 30);
    }
    return () => { if (phaseTimerRef.current) clearInterval(phaseTimerRef.current); };
  }, [gameState, round, baseMemoryTime]);

  const handleFinishedMemorizing = () => {
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    const timeUsed = (Date.now() - memorizeStartRef.current) / 1000;
    setTotalMemorizeTime(prev => prev + timeUsed);
    playSound('ready');
    // ZERO DELAY JUMP
    setTopCells(prev => prev.map(c => ({...c, isHidden: true})));
    setGameState('PLAYING');
  };

  const handleTopClick = (index: number) => {
    if (gameState !== 'PLAYING') return;
    const cell = topCells[index];
    if (interactionCells.includes(cell.totem)) return; 
    playSound('click');
    setSelectedSourceIndex(index === selectedSourceIndex ? null : index);
  };

  const handleBottomClick = (targetIndex: number) => {
    if (gameState !== 'PLAYING') return;
    if (interactionCells[targetIndex]) return; 
    if (selectedSourceIndex !== null) {
      const sourceTotem = topCells[selectedSourceIndex].totem;
      if (sourceTotem && !interactionCells.includes(sourceTotem)) {
        playSound('click');
        const newInteractions = [...interactionCells];
        newInteractions[targetIndex] = sourceTotem;
        setInteractionCells(newInteractions);
        setSelectedSourceIndex(null);
        if (newInteractions.every(cell => cell !== null)) {
          verifyRound(newInteractions);
        }
      }
    }
  };

  const verifyRound = (finalInteractions: (string | null)[]) => {
    let roundPoints = 0;
    let allCorrect = true;
    finalInteractions.forEach((placed, idx) => {
      if (placed === targets[idx]) roundPoints++;
      else allCorrect = false;
    });
    
    setLastRoundCorrect(allCorrect);
    if (allCorrect) playSound('success');
    else playSound('fail');

    const newTotalScore = score + roundPoints;
    setScore(newTotalScore);
    if (newTotalScore > highScore) {
      setHighScore(newTotalScore);
      localStorage.setItem('totem-high-score', newTotalScore.toString());
    }
    setTopCells(prev => prev.map(cell => ({ ...cell, isHidden: false })));
    setGameState('ROUND_RESULT');
  };

  const getEvaluation = () => {
    const efficiency = score / (SESSION_DURATION / 60);
    const avgMemo = totalMemorizeTime / round;
    
    if (efficiency >= 18) return { label: '腦力超神', color: 'text-emerald-500', desc: '神乎其技的處理效能，幾乎不需要觀看時間，認知靈敏度頂尖。' };
    if (efficiency >= 12) return { label: '靈敏卓越', color: 'text-blue-500', desc: '在極短時間內完成大量資訊提取，大腦迴路非常年輕。' };
    if (efficiency >= 6) return { label: '狀態穩定', color: 'text-yellow-600', desc: '表現穩健，建議練習在 3 秒內按出「記好了」來挑戰大腦極限。' };
    return { label: '需多練習', color: 'text-rose-500', desc: '建議每日進行 120 秒測試，規律訓練能顯著活化認知提取速度。' };
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.href)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-start p-2 font-sans select-none overflow-y-auto overflow-x-hidden pb-12">
      
      {/* Session Progress Bar */}
      {gameState !== 'IDLE' && gameState !== 'FINAL_SUMMARY' && (
        <div className="fixed top-0 left-0 w-full h-4 bg-slate-800 z-[60]">
          <div 
            className={`h-full transition-all duration-1000 ${sessionTimeLeft < 30 ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.9)]' : 'bg-emerald-500'}`} 
            style={{ width: `${(sessionTimeLeft / SESSION_DURATION) * 100}%` }}
          />
        </div>
      )}

      {/* HUD Headers */}
      <div className="fixed top-10 left-4 z-50 flex gap-3">
        <div className="bg-white px-4 py-2 rounded-2xl border-4 border-blue-600 shadow-xl">
          <div className="text-[10px] font-black text-blue-800 uppercase">積分</div>
          <div className="text-3xl font-black text-black leading-tight">{score}</div>
        </div>
        <div className={`bg-white px-4 py-2 rounded-2xl border-4 shadow-xl transition-colors ${sessionTimeLeft < 20 ? 'border-rose-600 animate-pulse' : 'border-slate-300'}`}>
          <div className="text-[10px] font-black text-slate-500 uppercase">剩餘</div>
          <div className={`text-3xl font-black leading-tight ${sessionTimeLeft < 20 ? 'text-rose-600' : 'text-black'}`}>
            {sessionTimeLeft}s
          </div>
        </div>
      </div>

      <div className="fixed top-10 right-4 z-50 flex flex-col gap-2">
        <button onClick={() => { initAudio(); setSoundEnabled(!soundEnabled); }}
          className={`p-3 rounded-2xl border-4 shadow-xl transition-all ${soundEnabled ? 'bg-blue-600 border-white text-white' : 'bg-slate-700 border-slate-500 text-slate-400'}`}>
          <span className="text-2xl">{soundEnabled ? '🔊' : '🔇'}</span>
        </button>
      </div>

      <div className="max-w-2xl w-full text-center space-y-4 px-4">
        
        {/* Header Area */}
        <div className="pt-28 flex flex-col items-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-yellow-400 drop-shadow-[0_8px_0_rgba(0,0,0,1)] mb-1">哞喵旺莓</h1>
          <p className="text-white/40 font-black text-xl uppercase tracking-[0.3em]">零延遲認知鑑別系統</p>
        </div>

        {/* Game Board */}
        {gameState !== 'FINAL_SUMMARY' && (
          <div className="bg-slate-700 p-5 rounded-[3.5rem] border-[12px] border-slate-800 shadow-2xl space-y-6 relative">
            
            {/* Top Grid */}
            <div className="grid grid-cols-4 gap-3">
              {topCells.length > 0 ? topCells.map((cell, idx) => {
                const isUsed = interactionCells.includes(cell.totem);
                const isSelected = selectedSourceIndex === idx;
                let bgColor = "bg-white", textColor = "text-red-600", borderColor = "border-slate-300";
                if (cell.isHidden) {
                  if (isSelected) { bgColor = "bg-blue-600 scale-105"; textColor = "text-white"; borderColor = "border-white"; }
                  else { bgColor = "bg-slate-800"; textColor = "text-white/5"; borderColor = "border-slate-600"; }
                }
                return (
                  <button key={cell.id} disabled={gameState !== 'PLAYING' || isUsed} onClick={() => handleTopClick(idx)}
                    className={`relative aspect-square rounded-[1.5rem] flex items-center justify-center transition-all duration-75 border-[6px] ${bgColor} ${borderColor} ${isUsed && cell.isHidden ? 'opacity-10 scale-90' : 'opacity-100 shadow-lg'}`}>
                    <span className={`${cell.isHidden ? 'text-4xl' : 'text-5xl md:text-7xl'} font-black leading-none ${textColor}`}>
                      {cell.isHidden ? (isSelected ? '✓' : '?') : cell.totem}
                    </span>
                  </button>
                );
              }) : Array.from({length: 8}).map((_, i) => <div key={i} className="aspect-square rounded-[1.5rem] bg-slate-900/50 border-4 border-slate-800" />)}
            </div>

            {/* ACTION BAR: THE CORE OF FREEDOM */}
            <div className="h-20 w-full relative overflow-hidden rounded-3xl border-4 border-slate-900 shadow-inner flex items-center bg-black">
              {gameState === 'MEMORIZING' && (
                <>
                  <div className="absolute top-0 left-0 h-full bg-yellow-400 border-r-4 border-white transition-all duration-75" style={{ width: `${phaseTimeLeft}%` }} />
                  <button 
                    onClick={handleFinishedMemorizing}
                    className="absolute inset-0 z-20 flex items-center justify-center text-4xl font-black text-white tracking-widest bg-emerald-600/10 active:bg-emerald-600 transition-colors shadow-2xl border-4 border-white/20">
                    【 記好了 ➔ 】
                  </button>
                </>
              )}
              {gameState === 'PLAYING' && <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse">請填入隱藏圖騰</div>}
              {gameState === 'ROUND_RESULT' && (
                <div className={`absolute inset-0 flex items-center justify-center text-4xl font-black uppercase ${lastRoundCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {lastRoundCorrect ? '✓ 太棒了' : '✗ 可惜了'}
                </div>
              )}
            </div>

            {/* Target Grid */}
            <div className="grid grid-cols-4 gap-3">
              {interactionCells.map((placed, idx) => {
                const isCorrect = gameState === 'ROUND_RESULT' && placed === targets[idx];
                const isWrong = gameState === 'ROUND_RESULT' && placed !== targets[idx];
                return (
                  <div key={`target-${idx}`} onClick={() => handleBottomClick(idx)}
                    className={`relative aspect-square rounded-[1.5rem] flex flex-col items-center justify-center border-[6px] transition-all duration-75 cursor-pointer ${placed ? 'bg-white border-blue-600 shadow-xl' : 'bg-black border-slate-600 border-dashed'} ${isCorrect ? '!bg-emerald-100 !border-emerald-600 scale-105 z-10' : ''} ${isWrong ? '!bg-rose-100 !border-rose-600 animate-shake' : ''}`}>
                    {placed ? (
                      <span className={`text-5xl md:text-7xl font-black ${isCorrect ? 'text-emerald-700' : isWrong ? 'text-rose-700' : 'text-blue-800'}`}>{placed}</span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-white/40 uppercase">目標</span>
                        <span className="text-4xl font-black text-yellow-400/40">{targets[idx] || '?'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase Overlays */}
        <div className="min-h-[220px] flex flex-col items-center justify-center">
          {gameState === 'IDLE' && (
            <div className="w-full space-y-6 animate-in zoom-in-95 duration-300">
              <div className="bg-white p-8 rounded-[3rem] border-[10px] border-blue-600 shadow-2xl space-y-6">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight underline decoration-blue-500 decoration-8 underline-offset-8">認知提取測試</h2>
                <div className="bg-blue-50 p-6 rounded-3xl text-left border-2 border-blue-100">
                  <p className="text-slate-600 font-bold text-xl leading-relaxed">
                    💡 點擊 <span className="text-emerald-600">「記好了」</span> 瞬發跳轉。<br/>
                    💡 系統已移除動畫等待時間。<br/>
                    💡 120 秒測試您的極限腦力！
                  </p>
                </div>
                <button onClick={() => initRound(true)} className="w-full py-8 bg-yellow-400 text-black rounded-[2.5rem] font-black text-5xl shadow-[0_12px_0_rgba(180,140,0,1)] border-4 border-black active:translate-y-2 transition-all">立即開始</button>
              </div>
            </div>
          )}

          {gameState === 'ROUND_RESULT' && (
            <div className="w-full space-y-4 animate-in zoom-in-95 duration-100">
              <button onClick={() => { setRound(r => r + 1); initRound(false); }}
                className="w-full py-12 bg-emerald-500 text-white rounded-[2.5rem] font-black text-7xl border-b-8 border-emerald-900 shadow-2xl active:translate-y-2 active:shadow-none transition-all">
                下一關 ➔
              </button>
              <div className="text-white/40 font-black text-2xl uppercase tracking-widest animate-pulse">快點按！時間不等人</div>
            </div>
          )}

          {gameState === 'FINAL_SUMMARY' && (
            <div className="w-full space-y-8 animate-in slide-in-from-bottom-20 duration-500">
              <div className="bg-white p-10 rounded-[4rem] border-[12px] border-blue-600 shadow-2xl space-y-8 text-slate-900">
                <div className="space-y-1">
                  <div className="inline-block bg-slate-900 text-white px-6 py-2 rounded-full text-xl font-black">評估報告</div>
                  <h2 className="text-8xl font-black text-blue-600 tracking-tighter">{score}</h2>
                  <div className="text-slate-400 font-black text-2xl uppercase tracking-widest">Score Points</div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                    <div className="text-slate-400 text-[10px] font-black">挑戰關卡</div>
                    <div className="text-3xl font-black">{round}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                    <div className="text-slate-400 text-[10px] font-black">記憶均速</div>
                    <div className="text-3xl font-black text-blue-600">{(totalMemorizeTime/round).toFixed(1)}s</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                    <div className="text-slate-400 text-[10px] font-black">正確率</div>
                    <div className="text-3xl font-black text-emerald-600">{Math.round((score/(round*4))*100)}%</div>
                  </div>
                </div>

                <div className="p-8 bg-blue-50 rounded-[3rem] border-4 border-blue-200">
                   <div className={`text-5xl font-black mb-2 ${getEvaluation().color}`}>{getEvaluation().label}</div>
                   <p className="text-slate-600 font-bold text-xl leading-relaxed">{getEvaluation().desc}</p>
                </div>

                <button onClick={() => setGameState('IDLE')} className="w-full py-6 bg-slate-800 text-white rounded-[2rem] font-black text-3xl shadow-xl active:scale-95 transition-all">重新測試</button>
              </div>

              <button onClick={() => setShowPoster(true)} className="flex items-center gap-4 bg-rose-600 text-white px-10 py-5 rounded-full font-black text-2xl shadow-2xl border-4 border-white active:scale-95 transition-all">
                <span>🎁</span> 領取認知分析海報
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Poster Modal */}
      {showPoster && (
        <div className="fixed inset-0 bg-black/98 z-[100] flex items-center justify-center p-4" onClick={() => setShowPoster(false)}>
           <div className="bg-white p-10 rounded-[4rem] text-center max-w-sm w-full space-y-8 animate-in zoom-in-90 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-4 right-8 text-slate-300 font-black text-5xl cursor-pointer" onClick={() => setShowPoster(false)}>×</div>
              <div className="space-y-2">
                <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black">認知健康數字化報告</div>
                <h3 className="text-6xl font-black text-slate-900 leading-none">哞喵旺莓</h3>
                <div className="text-emerald-600 font-black text-2xl mt-4">積分：{score} | 記憶速度：{(totalMemorizeTime/round).toFixed(1)}s</div>
              </div>
              <div className="bg-white p-6 rounded-[3rem] border-[12px] border-emerald-500 shadow-2xl inline-block">
                <img src={qrCodeUrl} alt="QR Code" className="w-60 h-60" />
              </div>
              <div className="p-6 bg-slate-100 rounded-3xl text-left text-slate-700 font-bold leading-relaxed text-sm border-2 border-slate-200">
                此報告排除所有系統延遲，真實反映受試者的<span className="text-rose-600">資訊處理核心能力</span>。主動縮短觀看時間是提高大腦活性的關鍵。
              </div>
              <button onClick={() => setShowPoster(false)} className="w-full py-5 bg-slate-800 text-white rounded-[2rem] font-black text-2xl">返回</button>
           </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out infinite; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; height: 50px; width: 50px; border-radius: 50%; background: #2563eb; cursor: pointer; border: 6px solid white; box-shadow: 0 0 15px rgba(0,0,0,0.3);
        }
        html, body { height: 100%; overflow: auto; background: #020617; }
        #root { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TotemGame />);
}
