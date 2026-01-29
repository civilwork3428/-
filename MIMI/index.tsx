
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- Constants ---
// 6 animals + 10 numbers = 16 unique totems
const TOTEM_POOL = ['🐶', '🐱', '🐄', '🐑', '🐰', '🐸', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
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
  const roundStartTimeRef = useRef<number>(0);

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
      osc.frequency.setValueAtTime(1200, now);
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
    
    // Select 8 unique totems from the 16 available to increase diversity
    const shuffledPool = [...TOTEM_POOL].sort(() => Math.random() - 0.5);
    const roundSelection = shuffledPool.slice(0, TOP_CELLS_COUNT);
    
    const initialTop = roundSelection.map((totem, i) => ({
      id: i,
      totem: totem,
      isHidden: false,
    }));
    
    // Pick 4 unique targets from the 8 selected for this round
    const chosenTargets = [...roundSelection].sort(() => Math.random() - 0.5).slice(0, BOTTOM_CELLS_COUNT);
    
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
    setTopCells(prev => prev.map(c => ({...c, isHidden: true})));
    setGameState('PLAYING');
    roundStartTimeRef.current = Date.now();
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
    const elapsedSeconds = (Date.now() - roundStartTimeRef.current) / 1000;
    let roundPoints = 0;
    let allCorrect = true;
    finalInteractions.forEach((placed, idx) => {
      if (placed === targets[idx]) roundPoints++;
      else allCorrect = false;
    });

    const speedBonus = allCorrect && elapsedSeconds < 5 ? Math.ceil(5 - elapsedSeconds) : 0;
    const finalRoundPoints = roundPoints + speedBonus;
    
    setLastRoundCorrect(allCorrect);
    if (allCorrect) playSound('success');
    else playSound('fail');

    const newTotalScore = score + finalRoundPoints;
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
    if (efficiency >= 22) return { label: '神經傳導大師', color: 'text-emerald-500', desc: '手腦協調趨於化境，視覺搜尋與精細運動控制完美結合。' };
    if (efficiency >= 15) return { label: '靈活協調', color: 'text-blue-500', desc: '手部動作精確且反應迅速，大腦對空間與圖騰的處理效能極佳。' };
    if (efficiency >= 9) return { label: '良好發展', color: 'text-yellow-600', desc: '協調性穩定，建議多挑戰「快速點擊」來進一步活化神經突觸。' };
    return { label: '協調啟動中', color: 'text-rose-500', desc: '手眼配合尚有進步空間，每日練習 120 秒能顯著提昇手腦連結強度。' };
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.href)}`;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-start p-2 font-sans select-none overflow-y-auto overflow-x-hidden pb-12">
      
      {gameState !== 'IDLE' && gameState !== 'FINAL_SUMMARY' && (
        <div className="fixed top-0 left-0 w-full h-4 bg-slate-900 z-[60]">
          <div 
            className={`h-full transition-all duration-1000 ${sessionTimeLeft < 30 ? 'bg-rose-500 shadow-[0_0_25px_rgba(244,63,94,1)]' : 'bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]'}`} 
            style={{ width: `${(sessionTimeLeft / SESSION_DURATION) * 100}%` }}
          />
        </div>
      )}

      <div className="fixed top-10 left-4 z-50 flex gap-3">
        <div className="bg-white px-4 py-2 rounded-2xl border-4 border-blue-600 shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
          <div className="text-[10px] font-black text-blue-800 uppercase leading-none mb-1">Score</div>
          <div className="text-3xl font-black text-black leading-none">{score}</div>
        </div>
        <div className={`bg-white px-4 py-2 rounded-2xl border-4 shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-colors ${sessionTimeLeft < 20 ? 'border-rose-600 animate-pulse' : 'border-slate-300'}`}>
          <div className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1">Time</div>
          <div className={`text-3xl font-black leading-none ${sessionTimeLeft < 20 ? 'text-rose-600' : 'text-black'}`}>
            {sessionTimeLeft}s
          </div>
        </div>
      </div>

      <div className="fixed top-10 right-4 z-50">
        <button onClick={() => { initAudio(); setSoundEnabled(!soundEnabled); }}
          className={`p-3 rounded-2xl border-4 shadow-xl transition-all active:scale-90 ${soundEnabled ? 'bg-blue-600 border-white text-white' : 'bg-slate-700 border-slate-500 text-slate-400'}`}>
          <span className="text-2xl">{soundEnabled ? '🔊' : '🔇'}</span>
        </button>
      </div>

      <div className="max-w-2xl w-full text-center space-y-4 px-4">
        
        <div className="pt-28 flex flex-col items-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-yellow-400 drop-shadow-[0_10px_0_rgba(0,0,0,1)] mb-1 italic">哞喵旺莓</h1>
          <p className="text-white/30 font-black text-lg uppercase tracking-[0.4em]">Multi-Totem Synapse Sync</p>
        </div>

        {gameState !== 'FINAL_SUMMARY' && (
          <div className="bg-[#1e293b] p-5 rounded-[4rem] border-[14px] border-[#0f172a] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] space-y-6 relative overflow-hidden">
            
            <div className="grid grid-cols-4 gap-4">
              {topCells.length > 0 ? topCells.map((cell, idx) => {
                const isUsed = interactionCells.includes(cell.totem);
                const isSelected = selectedSourceIndex === idx;
                let bgColor = "bg-white", textColor = "text-red-600", borderColor = "border-slate-300";
                
                if (cell.isHidden) {
                  if (isSelected) { bgColor = "bg-blue-600 scale-105"; textColor = "text-white"; borderColor = "border-white shadow-[0_0_20px_rgba(37,99,235,0.8)]"; }
                  else { bgColor = "bg-slate-900"; textColor = "text-white/5"; borderColor = "border-slate-800 shadow-inner"; }
                }

                return (
                  <button key={cell.id} disabled={gameState !== 'PLAYING' || isUsed} onClick={() => handleTopClick(idx)}
                    className={`relative aspect-square rounded-[2rem] flex items-center justify-center transition-all duration-100 border-[6px] ${bgColor} ${borderColor} ${isUsed && cell.isHidden ? 'opacity-5 scale-90' : 'opacity-100 shadow-xl'} active:scale-75 active:rotate-3`}>
                    <span className={`${cell.isHidden ? 'text-4xl' : 'text-5xl md:text-7xl'} font-black leading-none ${textColor}`}>
                      {cell.isHidden ? (isSelected ? '✓' : '?') : cell.totem}
                    </span>
                  </button>
                );
              }) : Array.from({length: 8}).map((_, i) => <div key={i} className="aspect-square rounded-[2rem] bg-slate-900/30 border-4 border-slate-800" />)}
            </div>

            <div className="h-24 w-full relative overflow-hidden rounded-[2.5rem] border-4 border-slate-950 shadow-2xl flex items-center bg-black/40">
              {gameState === 'MEMORIZING' && (
                <>
                  <div className="absolute top-0 left-0 h-full bg-yellow-400 border-r-4 border-white transition-all duration-75" style={{ width: `${phaseTimeLeft}%` }} />
                  <button 
                    onClick={handleFinishedMemorizing}
                    className="absolute inset-0 z-20 flex items-center justify-center text-4xl font-black text-white tracking-widest bg-emerald-600/20 active:bg-emerald-600 active:scale-95 transition-all shadow-inner border-4 border-white/30 backdrop-blur-sm">
                    【 記好了 ➔ 】
                  </button>
                </>
              )}
              {gameState === 'PLAYING' && <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">16 種圖騰變幻訓練</div>}
              {gameState === 'ROUND_RESULT' && (
                <div className={`absolute inset-0 flex items-center justify-center text-5xl font-black uppercase italic ${lastRoundCorrect ? 'text-emerald-400 drop-shadow-[0_4px_10px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_4px_10px_rgba(251,113,133,0.5)]'}`}>
                  {lastRoundCorrect ? 'Perfect Sync!' : 'Focus!'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4">
              {interactionCells.map((placed, idx) => {
                const isCorrect = gameState === 'ROUND_RESULT' && placed === targets[idx];
                const isWrong = gameState === 'ROUND_RESULT' && placed !== targets[idx];
                return (
                  <div key={`target-${idx}`} onClick={() => handleBottomClick(idx)}
                    className={`relative aspect-square rounded-[2rem] flex flex-col items-center justify-center border-[6px] transition-all duration-100 cursor-pointer active:scale-90 ${placed ? 'bg-white border-blue-600 shadow-2xl' : 'bg-black border-slate-700 border-dashed'} ${isCorrect ? '!bg-emerald-50 !border-emerald-500 scale-110 z-10 shadow-[0_15px_30px_rgba(16,185,129,0.5)]' : ''} ${isWrong ? '!bg-rose-50 !border-rose-500 animate-shake' : ''}`}>
                    {placed ? (
                      <span className={`text-5xl md:text-7xl font-black ${isCorrect ? 'text-emerald-700' : isWrong ? 'text-rose-700' : 'text-blue-800'}`}>{placed}</span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-tighter">Slot</span>
                        <span className="text-4xl font-black text-yellow-400/30">{targets[idx] || '?'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="min-h-[220px] flex flex-col items-center justify-center w-full">
          {gameState === 'IDLE' && (
            <div className="w-full space-y-6 animate-in zoom-in-95 duration-300">
              <div className="bg-white p-10 rounded-[4rem] border-[12px] border-blue-600 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] space-y-6">
                <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter italic">手腦連結強化：多樣性版</h2>
                <div className="bg-blue-50 p-6 rounded-[2.5rem] text-left border-4 border-blue-100">
                  <p className="text-slate-700 font-bold text-xl leading-relaxed">
                    🎯 <span className="text-blue-600">多樣圖騰</span>：包含 6 種動物與 10 個數字，每局隨機組合。<br/>
                    🚀 <span className="text-emerald-600">反應加分</span>：5 秒內完成答題全對獲取速度加成。<br/>
                    🧠 <span className="text-slate-900">認知活化</span>：120 秒測試您的極致認知靈敏度。
                  </p>
                </div>
                <button onClick={() => initRound(true)} className="w-full py-10 bg-yellow-400 text-black rounded-[3rem] font-black text-6xl shadow-[0_15px_0_rgba(180,140,0,1)] border-4 border-black active:translate-y-2 active:shadow-none transition-all">START ➔</button>
              </div>
            </div>
          )}

          {gameState === 'ROUND_RESULT' && (
            <div className="w-full space-y-4 animate-in zoom-in-95 duration-100 px-4">
              <button onClick={() => { setRound(r => r + 1); initRound(false); }}
                className="w-full py-14 bg-emerald-500 text-white rounded-[3rem] font-black text-8xl border-b-[16px] border-emerald-900 shadow-[0_20px_40px_rgba(0,0,0,0.5)] active:translate-y-3 active:border-b-0 transition-all italic">
                NEXT ➔
              </button>
              <div className="text-white/40 font-black text-3xl uppercase tracking-widest animate-pulse italic">Keep It Moving!</div>
            </div>
          )}

          {gameState === 'FINAL_SUMMARY' && (
            <div className="w-full space-y-8 animate-in slide-in-from-bottom-20 duration-500">
              <div className="bg-white p-12 rounded-[5rem] border-[14px] border-blue-600 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] space-y-10 text-slate-900">
                <div className="space-y-1">
                  <div className="inline-block bg-slate-900 text-white px-8 py-2 rounded-full text-2xl font-black uppercase italic tracking-widest">Efficiency Index</div>
                  <h2 className="text-[10rem] font-black text-blue-600 leading-none tracking-tighter -my-4 drop-shadow-xl">{score}</h2>
                  <div className="text-slate-400 font-black text-3xl uppercase tracking-widest">Total Performance Score</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-6 rounded-[3rem] border-4 border-slate-100 shadow-sm">
                    <div className="text-slate-400 text-xs font-black uppercase">Level</div>
                    <div className="text-4xl font-black text-slate-800">{round}</div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[3rem] border-4 border-slate-100 shadow-sm">
                    <div className="text-slate-400 text-xs font-black uppercase">Motor Sync</div>
                    <div className="text-4xl font-black text-blue-600">{(totalMemorizeTime/round).toFixed(1)}s</div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[3rem] border-4 border-slate-100 shadow-sm">
                    <div className="text-slate-400 text-xs font-black uppercase">Accuracy</div>
                    <div className="text-4xl font-black text-emerald-600">{Math.round((score/(round*4))*100)}%</div>
                  </div>
                </div>

                <div className="p-10 bg-blue-50 rounded-[4rem] border-8 border-blue-100 shadow-inner">
                   <div className={`text-6xl font-black mb-3 italic ${getEvaluation().color}`}>{getEvaluation().label}</div>
                   <p className="text-slate-700 font-bold text-2xl leading-relaxed">{getEvaluation().desc}</p>
                </div>

                <button onClick={() => setGameState('IDLE')} className="w-full py-8 bg-slate-800 text-white rounded-[2.5rem] font-black text-4xl shadow-2xl active:scale-95 transition-all">RE-EVALUATE</button>
              </div>

              <button onClick={() => setShowPoster(true)} className="flex items-center gap-6 bg-rose-600 text-white px-12 py-6 rounded-full font-black text-3xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-4 border-white active:scale-95 transition-all">
                <span>🎁</span> 生成認知數據報告
              </button>
            </div>
          )}
        </div>
      </div>

      {showPoster && (
        <div className="fixed inset-0 bg-black/98 z-[100] flex items-center justify-center p-4" onClick={() => setShowPoster(false)}>
           <div className="bg-white p-12 rounded-[5rem] text-center max-w-sm w-full space-y-10 animate-in zoom-in-90 relative shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-[16px] border-emerald-500" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-4 right-10 text-slate-300 font-black text-6xl cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setShowPoster(false)}>×</div>
              <div className="space-y-4">
                <div className="inline-block bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest">Neural Link Sync Report</div>
                <h3 className="text-7xl font-black text-slate-900 leading-none italic">哞喵旺莓</h3>
                <div className="text-emerald-600 font-black text-3xl mt-6 px-4 py-2 border-y-4 border-emerald-100">協調分 {score} | 反應速度 {(totalMemorizeTime/round).toFixed(1)}s</div>
              </div>
              <div className="bg-white p-6 rounded-[4rem] border-[16px] border-slate-900 shadow-2xl inline-block">
                <img src={qrCodeUrl} alt="QR Code" className="w-56 h-56" />
              </div>
              <div className="p-8 bg-slate-50 rounded-[3rem] text-left text-slate-800 font-bold leading-relaxed text-base border-4 border-slate-100">
                測試包含 16 種圖騰變體。數據顯示受試者在多樣本資訊處理中具備高度 <span className="text-rose-600 underline">感知-動作效率</span>。
              </div>
              <button onClick={() => setShowPoster(false)} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-3xl shadow-xl active:scale-95 transition-all">CLOSE</button>
           </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-12px); }
          75% { transform: translateX(12px); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out infinite; }
        html, body { height: 100%; overflow: auto; background: #020617; }
        #root { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TotemGame />);
}
