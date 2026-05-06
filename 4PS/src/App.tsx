/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { Play, RotateCcw, Download, Clock, Trophy, Info } from "lucide-react";
import { toJpeg } from "html-to-image";

// --- Types ---
type Suit = "spades" | "hearts" | "diamonds" | "clubs";

interface Card {
  id: string;
  suit: Suit;
  value: number;
  label: string;
}

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const getSuitColor = (suit: Suit) => (suit === "hearts" || suit === "diamonds" ? "red" : "black");
const getSuitEmoji = (suit: Suit) => {
  switch (suit) {
    case "spades": return "♠️";
    case "hearts": return "♥️";
    case "diamonds": return "♦️";
    case "clubs": return "♣️";
  }
};

const getCardLabel = (val: number) => {
  if (val === 1) return "A";
  if (val === 11) return "J";
  if (val === 12) return "Q";
  if (val === 13) return "K";
  return val.toString();
};

const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    VALUES.forEach((value) => {
      deck.push({
        id: `${suit}-${value}-${Math.random()}`,
        suit,
        value,
        label: getCardLabel(value),
      });
    });
  });
  return deck.sort(() => Math.random() - 0.5);
};

// --- Sound Service ---
const useSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const initCtx = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSuccess = () => {
    initCtx();
    if (!audioCtx.current) return;
    const now = audioCtx.current.currentTime;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(now + 0.1);
  };

  const playMistake = () => {
    initCtx();
    if (!audioCtx.current) return;
    const now = audioCtx.current.currentTime;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(now + 0.3);
  };

  return { playSuccess, playMistake };
};

export default function App() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [deck, setDeck] = useState<Card[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [nickname, setNickname] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const { playSuccess, playMistake } = useSound();
  const certRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 0.1);
      }, 100);

      const handleKey = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        const current = deck[deck.length - 1];
        if (!current) return;

        if (key === 'a') handleSwipe(current, "top-left");
        if (key === 'w') handleSwipe(current, "top-right");
        if (key === 's') handleSwipe(current, "bottom-left");
        if (key === 'd') handleSwipe(current, "bottom-right");
      };

      window.addEventListener('keydown', handleKey);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        window.removeEventListener('keydown', handleKey);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState, deck]);

  const startGame = () => {
    const newDeck = generateDeck();
    setDeck(newDeck);
    setElapsedTime(0);
    setPenalties(0);
    setGameState("playing");
  };

  const handleSwipe = (card: Card, direction: "top-left" | "top-right" | "bottom-left" | "bottom-right") => {
    const isRed = getSuitColor(card.suit) === "red";
    const isEven = card.value % 2 === 0;

    let correct = false;
    // 紅單 Northwest (Top-Left)
    if (direction === "top-left" && isRed && !isEven) correct = true;
    // 紅雙 Northeast (Top-Right)
    if (direction === "top-right" && isRed && isEven) correct = true;
    // 黑單 Southwest (Bottom-Left)
    if (direction === "bottom-left" && !isRed && !isEven) correct = true;
    // 黑雙 Southeast (Bottom-Right)
    if (direction === "bottom-right" && !isRed && isEven) correct = true;

    if (correct) {
      playSuccess();
    } else {
      playMistake();
      setPenalties((p) => p + 1);
      setElapsedTime((t) => t + 3); // Penalty +3 seconds
    }

    setDeck((prev) => {
      const remaining = prev.filter((c) => c.id !== card.id);
      if (remaining.length === 0) {
        setGameState("gameover");
      }
      return remaining;
    });
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportJpg = async () => {
    if (!certRef.current || isExporting) return;
    
    setIsExporting(true);
    try {
      // Direct capture of the visible certificate
      const dataUrl = await toJpeg(certRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      
      const fileName = `手滑的決斷_證明_${nickname || "無名"}.jpg`;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("下載失敗。建議：您可直接對螢幕上的證明進行截圖儲存。");
    } finally {
      setIsExporting(false);
    }
  };

  const currentCard = deck[deck.length - 1];

  const totalCards = 36;
  const accuracy = Math.max(0, ((totalCards - penalties) / totalCards) * 100).toFixed(1);
  const rawTime = Math.max(0, elapsedTime - penalties * 3).toFixed(1);
  const penaltyTime = (penalties * 3).toFixed(1);

  const getRank = (time: number) => {
    if (time < 25) return { label: "SS+ / 傳說級", color: "#facc15" }; 
    if (time < 35) return { label: "S / 專業級", color: "#eab308" }; 
    if (time < 45) return { label: "A / 優異級", color: "#f97316" }; 
    if (time < 60) return { label: "B / 合格", color: "#a1a1aa" };
    return { label: "C / 待加強", color: "#ef4444" }; 
  };

  const rank = getRank(elapsedTime);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500 overflow-hidden flex flex-col items-center">
      {/* Visual background details */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(50,50,50,1)_0%,rgba(0,0,0,1)_100%)]" />
      </div>

      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <h2 className="text-3xl font-black text-center tracking-tighter">挑戰指南</h2>
              <div className="space-y-4 text-zinc-400">
                <p>這是一個競速挑戰，將中央的卡牌滑向對應區域：</p>
                <div className="grid grid-cols-2 gap-3 text-sm font-bold">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 rounded text-[10px] text-white">KEY A</div>
                    <div className="text-red-500 mb-1 font-black">↖️ 紅單</div>
                    <div className="text-[10px] opacity-60">紅心/方塊 (3,5,7,9)</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 rounded text-[10px] text-white">KEY W</div>
                    <div className="text-red-500 mb-1 font-black">↗️ 紅雙</div>
                    <div className="text-[10px] opacity-60">紅心/方塊 (2,4,6,8,10)</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-zinc-600 rounded text-[10px] text-white">KEY S</div>
                    <div className="text-white mb-1 font-black">↙️ 黑單</div>
                    <div className="text-[10px] opacity-60">黑桃/梅花 (3,5,7,9)</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-zinc-600 rounded text-[10px] text-white">KEY D</div>
                    <div className="text-white mb-1 font-black">↘️ 黑雙</div>
                    <div className="text-[10px] opacity-60">黑桃/梅花 (2,4,6,8,10)</div>
                  </div>
                </div>
                <div className="bg-red-900/20 text-red-500 p-3 rounded-xl border border-red-500/20 text-center text-sm font-black">
                  注意：滑錯將被罰時 3 秒！
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full py-4 bg-white text-black rounded-xl font-black text-lg hover:bg-zinc-200 transition-colors"
              >
                我準備好了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl px-4 py-8 flex flex-col items-center h-full relative z-10">
        <header className="w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
           <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter">手滑的決斷</h1>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-black tracking-widest uppercase mt-1">
                 <span className="w-4 h-[1px] bg-zinc-800" />
                 Speedrun Reaction Challenge
              </div>
           </div>

           <div className="flex gap-4">
              <div className="stat-plate">
                 <div className="label">TIME</div>
                 <div className="value">{elapsedTime.toFixed(1)}s</div>
              </div>
              <div className="stat-plate">
                 <div className="label">LEFT</div>
                 <div className="value text-red-500">{deck.length}</div>
              </div>
           </div>
        </header>

        <main className="flex-1 w-full flex flex-col items-center justify-center relative">
          {/* Visual Zones */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-4 opacity-10 pointer-events-none p-4">
             <div className="border-4 border-red-500 border-dashed rounded-3xl flex flex-col items-center justify-center">
                <span className="text-4xl font-black">A</span>
                <span className="text-xl font-bold">紅單 ODD</span>
             </div>
             <div className="border-4 border-red-500 border-dashed rounded-3xl flex flex-col items-center justify-center">
                <span className="text-4xl font-black">W</span>
                <span className="text-xl font-bold">紅雙 EVEN</span>
             </div>
             <div className="border-4 border-white border-dashed rounded-3xl flex flex-col items-center justify-center">
                <span className="text-4xl font-black">S</span>
                <span className="text-xl font-bold">黑單 ODD</span>
             </div>
             <div className="border-4 border-white border-dashed rounded-3xl flex flex-col items-center justify-center">
                <span className="text-4xl font-black">D</span>
                <span className="text-xl font-bold">黑雙 EVEN</span>
             </div>
          </div>

          <AnimatePresence mode="wait">
            {gameState === "idle" && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center gap-8 z-30"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-5xl font-black italic tracking-tighter">準備決斷</h2>
                  <p className="text-zinc-500 font-bold">這是極致反應力的測試</p>
                </div>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={startGame}
                    className="px-16 py-6 bg-white text-black rounded-full font-black text-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                  >
                    開始挑戰
                  </button>
                  <button 
                    onClick={() => setShowInstructions(true)}
                    className="flex items-center justify-center gap-2 text-zinc-500 hover:text-white transition-colors font-bold"
                  >
                    <Info size={18} /> 遊戲規則
                  </button>
                </div>
              </motion.div>
            )}

            {gameState === "playing" && currentCard && (
              <CardDisplay 
                key={currentCard.id}
                card={currentCard}
                onSwipe={(dir) => handleSwipe(currentCard, dir)}
                totalDeck={deck.length}
              />
            )}

            {gameState === "gameover" && (
              <motion.div 
                key="gameover"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl flex flex-col items-center gap-6 z-40 pb-20"
              >
                {/* Visual Certificate Card - Now fully visible */}
                <div className="w-full overflow-x-auto pb-4 scrollbar-hide flex justify-center">
                  <div 
                    ref={certRef}
                    className="bg-white text-black p-8 md:p-12 shadow-2xl flex flex-col items-center relative"
                    style={{ 
                      width: '600px',
                      minHeight: '848px',
                      border: '20px solid #000',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div className="w-full flex justify-between items-start mb-8">
                       <div className="text-3xl font-black italic border-l-8 border-red-600 pl-4 leading-none">
                         SLIPPERY<br/>DECISION
                       </div>
                       <div className="text-[10px] text-zinc-400 font-bold text-right uppercase tracking-[0.2em]">
                         SPEEDRUN PERFORMANCE<br/>國土永續 2026
                       </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
                       <div className="text-center">
                         <div className="w-12 h-1 bg-red-600 mx-auto mb-3"></div>
                         <h2 className="text-4xl font-black whitespace-nowrap">極速決策力檢測證明</h2>
                         <div className="w-12 h-1 bg-red-600 mx-auto mt-3"></div>
                       </div>

                       <div className="text-center w-full">
                         <p className="text-xs font-bold text-zinc-500 tracking-widest mb-2 uppercase">受試選手</p>
                         <div className="text-5xl font-black border-b-2 border-zinc-100 px-6 pb-2 inline-block min-w-[200px]">
                           {nickname || "挑戰者"}
                         </div>
                       </div>

                       <div className="text-2xl font-black tracking-[0.2em] text-zinc-800 py-2">
                         《手滑的決斷》遊戲結算
                       </div>

                       <div className="text-center">
                          <p className="text-[10px] font-black text-zinc-400 tracking-[0.4em] mb-2">FINAL SCORE</p>
                          <div className="text-8xl font-black leading-none">
                            {elapsedTime.toFixed(1)}<span className="text-2xl text-red-600 ml-1">SEC</span>
                          </div>
                       </div>

                       <div className="flex items-center gap-6 bg-zinc-50 py-4 px-8 rounded-2xl border border-zinc-100 font-bold text-sm">
                          <div className="text-zinc-400">實際耗時 {rawTime}s</div>
                          <div className="text-red-500 font-black">+</div>
                          <div className="text-zinc-400">失誤加時 {penaltyTime}s</div>
                       </div>
                    </div>

                    <div className="w-full mt-10 pt-6 border-t border-zinc-100 flex justify-between items-end">
                       <div className="text-[10px] font-black uppercase text-zinc-800">手滑的決斷 決策研究中心</div>
                       <div className="text-[10px] font-black text-red-600">國土永續 2026 OFFICIAL DOCUMENT</div>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] text-zinc-500 font-black text-center uppercase tracking-widest">輸入選手名後下載正式證明</p>
                    <input 
                      type="text" 
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="於此輸入您的暱稱"
                      maxLength={10}
                      className="w-full bg-zinc-900 border-2 border-zinc-800 focus:border-red-600 rounded-2xl px-6 py-4 text-center font-bold outline-none transition-all placeholder:text-zinc-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={exportJpg}
                      disabled={!nickname || isExporting}
                      className={`w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-red-900/20 ${isExporting ? "" : "hover:bg-red-500"}`}
                    >
                      <Download size={20} /> {isExporting ? "產製中..." : "保存為成績證明 (JPG)"}
                    </button>
                    <button 
                      onClick={startGame}
                      className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-black text-lg hover:bg-zinc-700 hover:text-white transition-all flex items-center justify-center gap-3"
                    >
                      <RotateCcw size={20} /> 再次挑戰
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style>{`
        .stat-plate {
          @apply bg-zinc-900 border border-white/5 px-6 py-3 rounded-2xl text-center min-w-[100px];
        }
        .stat-plate .label {
          @apply text-[10px] text-zinc-600 font-black uppercase mb-1 tracking-widest;
        }
        .stat-plate .value {
          @apply text-2xl font-black italic font-mono leading-none;
        }
      `}</style>
    </div>
  );
}

interface CardDisplayProps {
  key?: string | number;
  card: Card;
  onSwipe: (dir: "top-left" | "top-right" | "bottom-left" | "bottom-right") => void;
  totalDeck: number;
}

function CardDisplay({ card, onSwipe, totalDeck }: CardDisplayProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-25, 25]);
  const opacity = useTransform(x, [-250, -150, 0, 150, 250], [0, 1, 1, 1, 0]);
  
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    const { offset } = info;

    if (Math.abs(offset.x) > threshold || Math.abs(offset.y) > threshold) {
      if (offset.y < -threshold) {
        if (offset.x < -threshold) onSwipe("top-left");
        else if (offset.x > threshold) onSwipe("top-right");
      } else if (offset.y > threshold) {
        if (offset.x < -threshold) onSwipe("bottom-left");
        else if (offset.x > threshold) onSwipe("bottom-right");
      }
    }
  };

  const isRed = getSuitColor(card.suit) === "red";

  return (
    <div className="relative w-72 h-[450px] flex items-center justify-center">
      {/* Deck stack visual */}
      {Array.from({ length: Math.min(totalDeck - 1, 5) }).map((_, i) => (
        <div 
          key={i}
          className="absolute w-64 h-96 bg-zinc-900 border border-white/10 rounded-3xl"
          style={{ 
            transform: `translate(${(i + 1) * 2}px, ${(i + 1) * 2}px)`,
            zIndex: 10 - i,
            opacity: 1 - (i * 0.15)
          }}
        />
      ))}

      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={1}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotate, opacity }}
        whileTap={{ scale: 1.05 }}
        className="w-64 h-96 bg-white rounded-3xl shadow-2xl flex flex-col p-6 cursor-grab active:cursor-grabbing border-[6px] border-zinc-100 z-50 text-black overflow-hidden"
      >
        <div className={`flex justify-between items-start ${isRed ? "text-red-500" : "text-zinc-950"}`}>
           <div className="flex flex-col items-center">
              <span className="text-4xl font-black leading-none">{card.label}</span>
              <span className="text-2xl">{getSuitEmoji(card.suit)}</span>
           </div>
           <div className="flex flex-col items-center rotate-180">
              <span className="text-4xl font-black leading-none">{card.label}</span>
              <span className="text-2xl">{getSuitEmoji(card.suit)}</span>
           </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative">
          <span className={`text-[12rem] absolute opacity-10 select-none ${isRed ? "text-red-500" : "text-black"}`}>
            {getSuitEmoji(card.suit)}
          </span>
          <span className={`text-9xl font-black italic tracking-tighter relative z-10 ${isRed ? "text-red-500" : "text-black"}`}>
            {card.label}
          </span>
        </div>

        <div className={`flex justify-between items-end ${isRed ? "text-red-500" : "text-zinc-950"}`}>
           <div className="flex flex-col items-center">
              <span className="text-4xl font-black leading-none">{card.label}</span>
              <span className="text-2xl">{getSuitEmoji(card.suit)}</span>
           </div>
           <div className="flex flex-col items-center rotate-180">
              <span className="text-4xl font-black leading-none">{card.label}</span>
              <span className="text-2xl">{getSuitEmoji(card.suit)}</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
