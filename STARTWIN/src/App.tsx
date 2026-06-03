/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCcw, Eye, Settings2, Info, CheckCircle2, Download } from 'lucide-react';
import { GridSize, GameMode, Puzzle, GameCell, MARKS, FIELDS, COLORS, HOVER_COLORS } from './types';
import { generatePuzzle } from './gameLogic';
import { playCatchSound, playRevealSound, playWrongSound, playVictorySound, playMonkeySqueak } from './audioUtils';
import { toJpeg } from 'html-to-image';
import download from 'downloadjs';

const EmbarrassedDance: React.FC = () => {
  const emojis = ['😅', '😅', '😅', '🎇', '✨', '🎆', '😅', '✨'];
  const particles = Array.from({ length: 20 });
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * window.innerWidth, 
            y: window.innerHeight + 100,
            rotate: 0,
            scale: 0.5 + Math.random()
          }}
          animate={{ 
            x: [
              Math.random() * window.innerWidth, 
              (Math.random() - 0.5) * 200 + (window.innerWidth / 2),
              Math.random() * window.innerWidth,
            ],
            y: [
              window.innerHeight + 100,
              Math.random() * (window.innerHeight * 0.8),
              -100
            ],
            rotate: [0, 180, 360, 720],
            scale: [1, 1.5, 1.2, 1.5, 1],
            opacity: [0, 1, 1, 0.8, 0]
          }}
          transition={{ 
            duration: 2 + Math.random() * 3, 
            repeat: Infinity,
            ease: "easeOut",
            delay: Math.random() * 2
          }}
          className="absolute text-4xl md:text-6xl select-none"
        >
          {emojis[i % emojis.length]}
        </motion.div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [size, setSize] = useState<GridSize>(4);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [eyeClickCount, setEyeClickCount] = useState(0);
  const [wrongClickCount, setWrongClickCount] = useState(0);
  const [nickname, setNickname] = useState('');
  const [gameTime, setGameTime] = useState<number>(0);
  const currentPuzzleId = React.useRef<string | null>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);

  const initGame = useCallback((newSize: GridSize = size) => {
    const newPuzzle = generatePuzzle(newSize);
    currentPuzzleId.current = newPuzzle.id;
    setPuzzle(newPuzzle);
    setIsVictory(false);
    setFoundCount(0);
    setShowAnswer(false);
    setStartTime(Date.now());
    setEyeClickCount(0);
    setWrongClickCount(0);
    setGameTime(0);
  }, [size]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCellClick = (r: number, c: number) => {
    if (!puzzle || isVictory) return;

    const cell = puzzle.grid[r][c];
    
    // Prevent interaction with already correctly marked cells
    if (cell.isCorrect) return;

    const isMark = puzzle.solutions.some(s => s.r === r && s.c === c);

    if (isMark) {
      const puzzleId = puzzle.id;
      const newGrid = puzzle.grid.map(row => row.map(cell => {
        if (cell.r === r && cell.c === c) {
          return { ...cell, isCorrect: true };
        }
        return cell;
      }));
      setPuzzle({ ...puzzle, grid: newGrid });
      setFoundCount(prev => prev + 1);
      playRevealSound();

      // Check victory
      const currentFound = newGrid.flat().filter(c => c.isCorrect).length;
      if (currentFound === puzzle.size * 2) {
        setTimeout(() => {
          if (currentPuzzleId.current !== puzzleId) return;
          setIsVictory(true);
          const duration = Math.floor((Date.now() - startTime) / 1000);
          setGameTime(duration);
          playVictorySound();
        }, 300);
      }
    } else {
      // Wrong click
      const newGrid = puzzle.grid.map(row => row.map(cell => {
        if (cell.r === r && cell.c === c) {
          return { ...cell, isWrong: true };
        }
        return cell;
      }));
      setPuzzle({ ...puzzle, grid: newGrid });
      setWrongClickCount(prev => prev + 1);
      playWrongSound();
      
      // Briefly show the emoji then hide it
      setTimeout(() => {
        if (currentPuzzleId.current !== puzzle.id) return;
        setPuzzle(prev => {
          if (!prev || prev.id !== puzzle.id) return prev;
          return {
            ...prev,
            grid: prev.grid.map(row => row.map(cell => {
              if (cell.r === r && cell.c === c) return { ...cell, isWrong: false };
              return cell;
            }))
          };
        });
      }, 800);
    }
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      const dataUrl = await toJpeg(exportRef.current, { quality: 0.95 });
      download(dataUrl, '遊戲打卡圖.jpg');
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (!puzzle) return <div className="flex items-center justify-center h-screen font-sans">載入中...</div>;

  return (
    <div className="h-screen bg-stone-950 p-3 md:p-6 font-sans text-stone-100 overflow-y-auto overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-3 md:space-y-6">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-1">法紋藏身：雙星輝映</h1>
        </header>

        {/* Level Selection & Manual Button */}
        <div className="flex flex-wrap justify-center items-center gap-3">
          <div className="bg-stone-900 p-1 rounded-xl shadow-sm border border-stone-800 flex gap-1">
            {[3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => { setSize(s as GridSize); initGame(s as GridSize); }}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all text-sm md:text-base ${
                  size === s
                    ? 'bg-white text-black shadow-md'
                    : 'text-stone-400 hover:bg-stone-800'
                }`}
              >
                {s === 3 ? '入門' : s === 4 ? '標準' : '挑戰'}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowManual(true)}
            className="bg-stone-900 p-2.5 rounded-xl shadow-sm border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800 transition-all flex items-center gap-1.5 font-bold text-sm"
            title="查看說明書"
          >
            <Settings2 className="w-4 h-4" />
            <span>說明書</span>
          </button>
        </div>


        {/* Game Board */}
        <div className="relative flex justify-center">
          <div 
            className="grid gap-1 p-1.5 bg-stone-900 rounded-2xl shadow-xl border border-stone-800 w-full max-w-[min(88vw,400px)] h-fit"
            style={{ 
              gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
            }}
          >
            {puzzle.grid.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative rounded-lg md:rounded-xl flex items-center justify-center text-2xl sm:text-3xl md:text-4xl transition-all duration-300 ${
                    COLORS[cell.regionId]
                  } ${cell.isCorrect ? 'brightness-125 ring-4 ring-white/40 shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105 z-10' : HOVER_COLORS[cell.regionId]} aspect-square shadow-sm active:scale-95 overflow-hidden`}
                >
                  <AnimatePresence mode="wait">
                    {cell.isCorrect ? (
                      <motion.span
                        key="mark"
                        initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="drop-shadow-sm select-none"
                      >
                        ✨
                      </motion.span>
                    ) : cell.isWrong ? (
                      <motion.span
                        key="wrong"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="z-10 select-none"
                      >
                        😅
                      </motion.span>
                    ) : null}

                    {showAnswer && !cell.isCorrect && puzzle.solutions.some(s => s.r === r && s.c === c) && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        className="absolute flex items-center justify-center pointer-events-none text-white/50"
                      >
                        ✨
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              ))
            )}
          </div>

          {/* Victory Overlay */}
          <AnimatePresence>
            {isVictory && (
              <>
                <EmbarrassedDance />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/50 backdrop-blur-md text-center px-6"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-stone-900 border-4 border-yellow-500 p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl space-y-6 max-w-[90vw] relative overflow-hidden"
                  >
                    {/* Decorative stars */}
                    <div className="absolute top-2 right-4 text-4xl animate-pulse">🎇</div>
                    <div className="absolute bottom-2 left-4 text-4xl animate-pulse">🎆</div>

                    <div className="flex justify-center flex-col items-center gap-2">
                       <span className="text-6xl animate-bounce">😅✨</span>
                       <h2 className="text-3xl md:text-5xl font-black text-white">唉呀！過關了</h2>
                       <p className="text-yellow-500 font-bold tracking-widest">雙星輝映，方陣平衡！</p>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                       <input 
                         type="text" 
                         placeholder="輸入暱稱 (可不填)" 
                         value={nickname}
                         onChange={(e) => setNickname(e.target.value)}
                         className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 font-bold outline-none focus:ring-2 focus:ring-green-500"
                       />
                       
                       <div className="grid grid-cols-2 gap-3">
                         <button
                           onClick={() => initGame()}
                           className="bg-stone-700 text-white px-6 py-4 rounded-2xl text-lg font-black hover:bg-stone-600 transition-all active:scale-95"
                         >
                           下一關
                         </button>
                         <button
                           onClick={handleExport}
                           className="bg-white text-black px-6 py-4 rounded-2xl text-lg font-black hover:bg-stone-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                         >
                           <Download className="w-5 h-5" />
                           <span>匯出</span>
                         </button>
                       </div>
                    </div>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Manual Modal Overlay */}
          <AnimatePresence>
            {showManual && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowManual(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full relative space-y-4"
                >
                  <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                      說明書 🛠
                    </h2>
                    <div className="h-0.5 w-8 bg-stone-700 mx-auto rounded-full" />
                  </div>

                  <div className="space-y-3 text-stone-200 font-bold text-sm md:text-base">
                    <div className="flex gap-2">
                      <span className="text-yellow-500">●</span>
                      <p>點擊色塊，找出隱藏的法紋。</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-yellow-500">●</span>
                      <p>每一橫排剛好藏著 2 個法紋。</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-yellow-500">●</span>
                      <p>每一直排剛好藏著 2 個法紋。</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-yellow-500">●</span>
                      <p>每一個顏色模塊剛好藏著 2 個法紋。</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowManual(false)}
                    className="w-full bg-white text-black py-3 rounded-xl font-black text-base hover:bg-stone-200 transition-all active:scale-95"
                  >
                    準備出發
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Controls */}
        <div className="flex justify-between items-center bg-stone-900 p-3 rounded-xl shadow-md border border-stone-800">
          <div className="flex gap-4">
             <div className="flex flex-col">
               <span className="text-[10px] text-stone-500 font-black uppercase tracking-wider">星光平衡</span>
               <span className="text-xl font-black text-white tracking-tighter">{foundCount} / {size * 2}</span>
             </div>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setShowAnswer(!showAnswer);
                if (!showAnswer) setEyeClickCount(prev => prev + 1);
              }}
              className="p-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors"
              title="顯示答案"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={() => initGame()}
              className="p-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors"
              title="重新開始"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <footer className="text-center pt-2 opacity-30 text-[10px] font-bold text-stone-400">
          <p>2026 國土永續-APP共享</p>
        </footer>
      </div>

      {/* Hidden Export Template */}
      <div className="fixed left-[-9999px] top-[-9999px]">
        <div 
          ref={exportRef}
          className="w-[1080px] h-[1920px] bg-stone-950 p-16 flex flex-col justify-between font-sans text-stone-100"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1c1917 0%, #0c0a09 100%)' }}
        >
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h1 className="text-9xl font-black tracking-tighter text-white">法紋藏身：雙星輝映</h1>
              <div className="h-2 w-48 bg-yellow-500 mx-auto rounded-full" />
            </div>

            <div className="bg-stone-900/50 border-4 border-stone-800 rounded-[4rem] p-16 space-y-12">
              <div className="space-y-8">
                <div className="flex justify-between items-end border-b-2 border-stone-800 pb-4">
                  <span className="text-4xl text-stone-500 font-bold uppercase tracking-widest text">遊戲名稱</span>
                  <span className="text-6xl font-black text-white">法紋藏身：雙星輝映</span>
                </div>
                <div className="flex justify-between items-end border-b-2 border-stone-800 pb-4">
                  <span className="text-4xl text-stone-500 font-bold uppercase tracking-widest">遊戲難度</span>
                  <span className="text-6xl font-black text-white">{size === 3 ? '入門' : size === 4 ? '標準' : '挑戰'}</span>
                </div>
                <div className="flex justify-between items-end border-b-2 border-stone-800 pb-4">
                  <span className="text-4xl text-stone-500 font-bold uppercase tracking-widest">遊戲時間</span>
                  <span className="text-6xl font-black text-white font-mono">{formatTime(gameTime)}</span>
                </div>
                <div className="flex justify-between items-end border-b-2 border-stone-800 pb-4">
                  <span className="text-4xl text-stone-500 font-bold uppercase tracking-widest">遊戲日期</span>
                  <span className="text-6xl font-black text-white font-mono">
                    {(() => {
                      const now = new Date();
                      const y = now.getFullYear();
                      const m = String(now.getMonth() + 1).padStart(2, '0');
                      const d = String(now.getDate()).padStart(2, '0');
                      const hh = String(now.getHours()).padStart(2, '0');
                      const mm = String(now.getMinutes()).padStart(2, '0');
                      return `${y}-${m}-${d} ${hh}:${mm}`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-end border-b-2 border-stone-800 pb-4">
                  <span className="text-4xl text-stone-500 font-bold uppercase tracking-widest">尷尬抓錯</span>
                  <span className="text-6xl font-black text-white">{wrongClickCount} <span className="text-3xl text-stone-600">次</span></span>
                </div>
                <div className="flex justify-between items-end border-b-2 border-stone-800 pb-4">
                  <span className="text-4xl text-stone-500 font-bold uppercase tracking-widest">雙星法紋</span>
                  <span className="text-6xl font-black text-white">{foundCount} / {size * 2}</span>
                </div>
                <div className="flex justify-between items-end border-b-2 border-stone-800 pb-4">
                  <span className="text-4xl text-stone-500 font-bold uppercase tracking-widest">暱稱</span>
                  <span className="text-6xl font-black text-yellow-400 truncate max-w-[500px]">{nickname || '無名氏'}</span>
                </div>
                {eyeClickCount > 0 && (
                  <div className="flex justify-between items-end border-b-2 border-stone-800 pb-4 bg-red-500/10 p-4 rounded-2xl">
                    <span className="text-4xl text-red-500 font-black uppercase tracking-widest">逃課魔人認證</span>
                    <span className="text-6xl font-black text-red-500">{eyeClickCount} <span className="text-3xl text-stone-400">次</span></span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center gap-6 pt-8">
                {Array.from({ length: size }).map((_, i) => (
                  <span key={i} className="text-8xl drop-shadow-2xl">✨</span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-6 opacity-40">
               <span className="text-6xl">✨</span>
               <div className="h-1 w-24 bg-stone-700" />
               <span className="text-6xl">😅</span>
               <div className="h-1 w-24 bg-stone-700" />
               <span className="text-6xl">✨</span>
            </div>
            <p className="text-4xl font-black text-stone-600 tracking-widest uppercase">
              2026國土永續-APP共享
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
