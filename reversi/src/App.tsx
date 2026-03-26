/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { RotateCcw, Trophy, User, Info, Volume2, VolumeX, Sparkles, Download, Edit2 } from 'lucide-react';

// Butterfly SVG Component
const ButterflyIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 19c0-4.5 3-9 3-9s3 4.5 3 9-3 3-3 3-3-1.5-3-3Z" />
    <path d="M12 19c0-4.5-3-9-3-9s-3 4.5-3 9 3 3 3 3 3-1.5 3-3Z" />
    <path d="M12 10c0-2 1-4 1-4s1 2 1 4" />
    <path d="M12 10c0-2-1-4-1-4s-1 2-1 4" />
  </svg>
);

type Player = 1 | 2; // 1: Green, 2: White
type CellValue = Player | null;

const BOARD_SIZE = 8;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Sound Utility using Web Audio API
const useSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playTone = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    if (muted) return;
    initAudio();
    const ctx = audioCtx.current!;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const playPlace = useCallback(() => playTone(440, 'sine', 0.1, 0.1), [muted]);
  const playFlip = useCallback(() => playTone(880, 'sine', 0.05, 0.05), [muted]);
  const playWin = useCallback(() => {
    playTone(523.25, 'triangle', 0.5, 0.1); // C5
    setTimeout(() => playTone(659.25, 'triangle', 0.5, 0.1), 100); // E5
    setTimeout(() => playTone(783.99, 'triangle', 0.5, 0.1), 200); // G5
    setTimeout(() => playTone(1046.50, 'triangle', 1.0, 0.1), 300); // C6
  }, [muted]);

  return React.useMemo(() => ({ 
    playPlace, playFlip, playWin, muted, setMuted 
  }), [playPlace, playFlip, playWin, muted]);
};

// Victory Cross Component
const VictoryCross: React.FC<{ color: string }> = ({ color }) => {
  const randomX = (Math.random() - 0.5) * 1500;
  const randomY = (Math.random() - 0.5) * 1500;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
      animate={{ 
        scale: [0, 2, 0], 
        opacity: [0, 1, 0],
        x: randomX,
        y: randomY,
        rotate: 720,
        rotateY: 1080
      }}
      transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatDelay: Math.random() * 2 }}
      className={`absolute pointer-events-none z-50 ${color}`}
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute w-1.5 h-12 bg-current rounded-full shadow-[0_0_15px_currentColor]" />
        <div className="absolute w-12 h-1.5 bg-current rounded-full shadow-[0_0_15px_currentColor]" />
      </div>
    </motion.div>
  );
};

export default function App() {
  const [board, setBoard] = useState<CellValue[][]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [gameOver, setGameOver] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [scores, setScores] = useState({ 1: 2, 2: 2 });
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [isSkipping, setIsSkipping] = useState<Player | null>(null);
  const [isStuckEnd, setIsStuckEnd] = useState(false);
  const [isFlippingTable, setIsFlippingTable] = useState(false);
  const [flippedBy, setFlippedBy] = useState<Player | null>(null);
  const [playerNames, setPlayerNames] = useState({ 1: '', 2: '' });
  const [isEditingNames, setIsEditingNames] = useState(false);
  const [showNameModal, setShowNameModal] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [gameId, setGameId] = useState(0);
  const [lastMove, setLastMove] = useState<{ r: number, c: number, time: number } | null>(null);
  const [activeVectors, setActiveVectors] = useState<{from: [number, number], to: [number, number], player: number}[]>([]);
  const { playPlace, playFlip, playWin, muted, setMuted } = useSound();

  // Initialize board
  const initGame = useCallback(() => {
    const newBoard: CellValue[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    
    // Starting positions
    newBoard[3][3] = 2;
    newBoard[3][4] = 1;
    newBoard[4][3] = 1;
    newBoard[4][4] = 2;

    setBoard(newBoard);
    setCurrentPlayer(1);
    setGameOver(false);
    setIsStuckEnd(false);
    setShowOverlay(false);
    setIsSkipping(null);
    setLastMove(null);
    setIsFlippingTable(false);
    setFlippedBy(null);
    setGameId(prev => prev + 1);
    setScores({ 1: 2, 2: 2 });
    setActiveVectors([]);
    setPlayerNames({ 1: '', 2: '' });
    setShowNameModal(true);
  }, []);

  const restartSamePlayers = useCallback(() => {
    const newBoard: CellValue[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    newBoard[3][3] = 2;
    newBoard[3][4] = 1;
    newBoard[4][3] = 1;
    newBoard[4][4] = 2;
    setBoard(newBoard);
    setCurrentPlayer(1);
    setGameOver(false);
    setIsStuckEnd(false);
    setShowOverlay(false);
    setIsSkipping(null);
    setLastMove(null);
    setIsFlippingTable(false);
    setFlippedBy(null);
    setGameId(prev => prev + 1);
    setScores({ 1: 2, 2: 2 });
    setActiveVectors([]);
    setShowNameModal(false);
  }, []);

  const handleFlipTable = () => {
    if (gameOver || isFlippingTable) return;
    setIsFlippingTable(true);
    setFlippedBy(currentPlayer);
    playWin(); // Use the win sound for the explosion
    
    // Force a draw state to trigger all pieces flying
    setScores({ 1: 32, 2: 32 });
    setGameOver(true);
    
    // Show overlay after a delay
    setTimeout(() => setShowOverlay(true), 4000);
  };

  useEffect(() => {
    initGame();
  }, [initGame]);

  const isValidPos = (r: number, c: number) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

  const getFlippablePieces = useCallback((r: number, c: number, player: Player, currentBoard: CellValue[][]) => {
    if (currentBoard[r][c] !== null) return [];

    const opponent = player === 1 ? 2 : 1;
    const allFlippable: [number, number][] = [];

    for (const [dr, dc] of DIRECTIONS) {
      let nr = r + dr;
      let nc = c + dc;
      const path: [number, number][] = [];

      while (isValidPos(nr, nc) && currentBoard[nr][nc] === opponent) {
        path.push([nr, nc]);
        nr += dr;
        nc += dc;
      }

      if (isValidPos(nr, nc) && currentBoard[nr][nc] === player && path.length > 0) {
        allFlippable.push(...path);
      }
    }

    return allFlippable;
  }, []);

  const calculateValidMoves = useCallback((player: Player, currentBoard: CellValue[][]) => {
    const moves: [number, number][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (getFlippablePieces(r, c, player, currentBoard).length > 0) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  }, [getFlippablePieces]);

  // Handle auto-skip logic in a dedicated effect to avoid race conditions
  useEffect(() => {
    if (board.length === 0 || gameOver || isSkipping === null) return;

    const opponent = currentPlayer === 1 ? 2 : 1;
    const timer = setTimeout(() => {
      setCurrentPlayer(opponent);
      setIsSkipping(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isSkipping, board.length, gameOver, currentPlayer]);

  // Main game logic effect
  useEffect(() => {
    if (board.length === 0 || gameOver || isSkipping !== null) return;
    
    const moves = calculateValidMoves(currentPlayer, board);
    
    // Only update if moves actually changed to prevent unnecessary re-renders
    setValidMoves(prev => {
      if (JSON.stringify(prev) === JSON.stringify(moves)) return prev;
      return moves;
    });

    if (moves.length === 0) {
      const opponent = currentPlayer === 1 ? 2 : 1;
      const opponentMoves = calculateValidMoves(opponent, board);
      
      if (opponentMoves.length === 0) {
        setGameOver(true);
        
        // Calculate if board is full to set isStuckEnd
        let totalPieces = 0;
        board.forEach(row => row.forEach(cell => {
          if (cell !== null) totalPieces++;
        }));
        setIsStuckEnd(totalPieces < 64);
        
        playWin();
        setTimeout(() => setShowOverlay(true), 3500);
      } else {
        setIsSkipping(currentPlayer);
      }
    }
  }, [board, currentPlayer, calculateValidMoves, playWin, gameOver, isSkipping]);

  const handleMove = (r: number, c: number) => {
    if (gameOver || isSkipping) return;
    
    const flippable = getFlippablePieces(r, c, currentPlayer, board);
    if (flippable.length === 0) return;

    playPlace();

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = currentPlayer;
    
    flippable.forEach(([fr, fc]) => {
      newBoard[fr][fc] = currentPlayer;
    });

    // Update board and scores in one go to ensure logic stability
    setBoard(newBoard);
    setLastMove({ r, c, time: Date.now() });
    
    let s1 = 0, s2 = 0;
    newBoard.forEach(row => row.forEach(cell => {
      if (cell === 1) s1++;
      if (cell === 2) s2++;
    }));
    setScores({ 1: s1, 2: s2 });

    // Play flip sound effect
    playFlip();

    // Switch player
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);

    // Set active vectors for visual feedback
    const vectors = flippable.map(([fr, fc]) => ({
      from: [r, c] as [number, number],
      to: [fr, fc] as [number, number],
      player: currentPlayer
    }));
    setActiveVectors(vectors);
    setTimeout(() => setActiveVectors([]), 800);
  };

  const winner = scores[1] > scores[2] ? 1 : scores[1] < scores[2] ? 2 : null;
  const loser = winner === 1 ? 2 : winner === 2 ? 1 : null;
  const totalPieces = scores[1] + scores[2];
  const settlementMode = isFlippingTable ? '打卡' : (totalPieces === 64 ? '正常' : '謀算');

  const exportRecord = async () => {
    const element = document.getElementById('game-record-card');
    if (!element || isExporting) return;
    
    setIsExporting(true);
    try {
      // Temporarily move the card to a renderable position
      const originalStyle = element.style.cssText;
      element.style.display = 'block';
      element.style.position = 'fixed';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '-1';
      element.style.visibility = 'visible';

      const canvas = await html2canvas(element, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      // Restore original style
      element.style.cssText = originalStyle;
      
      // Use toBlob for better reliability in iframes/mobile
      canvas.toBlob((blob) => {
        if (!blob) {
          setIsExporting(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `reversi-record-${Date.now()}.jpg`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Revoke the URL after a short delay to ensure the download started
        setTimeout(() => {
          URL.revokeObjectURL(url);
          setIsExporting(false);
        }, 100);
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error("Export failed:", err);
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans selection:bg-emerald-500/30 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4">
      {/* Nickname Setup Modal */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <User className="text-emerald-500" size={24} />
                </div>
                <h2 className="text-xl font-bold tracking-tight">設定玩家暱稱</h2>
              </div>

              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">綠方玩家 (Player 1)</label>
                  <input 
                    type="text"
                    value={playerNames[1]}
                    onChange={(e) => setPlayerNames(prev => ({ ...prev, 1: e.target.value }))}
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="輸入綠方暱稱..."
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">白方玩家 (Player 2)</label>
                  <input 
                    type="text"
                    value={playerNames[2]}
                    onChange={(e) => setPlayerNames(prev => ({ ...prev, 2: e.target.value }))}
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-white/20 outline-none transition-all"
                    placeholder="輸入白方暱稱..."
                    maxLength={8}
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  if (playerNames[1].trim() && playerNames[2].trim()) {
                    setShowNameModal(false);
                  }
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                disabled={!playerNames[1].trim() || !playerNames[2].trim()}
              >
                開始對弈
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Record Card for Export */}
      <div 
        id="game-record-card" 
        style={{ position: 'fixed', left: '-9999px', top: '0', display: 'none', backgroundColor: '#000000', color: '#ffffff', padding: '32px', border: '4px solid #7f1d1d', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', fontFamily: 'Inter, sans-serif' }}
        className="w-[400px]"
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: '900', letterSpacing: '-0.05em', color: '#ef4444', marginBottom: '8px', fontStyle: 'italic' }}>經典綠白棋 戰績表</h1>
          <div style={{ height: '4px', width: '100%', background: 'linear-gradient(to right, transparent, #ef4444, transparent)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(127, 29, 29, 0.3)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>綠方玩家 (綠棋)</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#34d399' }}>{playerNames[1]}</span>
            </div>
            <div style={{ fontSize: '30px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '900', color: '#34d399' }}>{scores[1]}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(127, 29, 29, 0.3)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>白方玩家 (白棋)</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>{playerNames[2]}</span>
            </div>
            <div style={{ fontSize: '30px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '900', color: '#ffffff' }}>{scores[2]}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px' }}>
            <div style={{ backgroundColor: 'rgba(24, 24, 27, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(127, 29, 29, 0.2)' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>結算模式</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: settlementMode === '謀算' ? '#f59e0b' : settlementMode === '打卡' ? '#ef4444' : '#10b981' }}>
                {settlementMode}
              </span>
            </div>
            <div style={{ backgroundColor: 'rgba(24, 24, 27, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(127, 29, 29, 0.2)' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>遊戲結果</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>
                {winner ? `${playerNames[winner]} 勝利` : '平手'}
              </span>
            </div>
          </div>

          {flippedBy && (
            <div style={{ backgroundColor: 'rgba(127, 29, 29, 0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>發動翻桌</span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444', fontStyle: 'italic' }}>
                {playerNames[flippedBy]}
              </span>
            </div>
          )}
        </div>

        <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1px solid rgba(127, 29, 29, 0.3)', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>日期: {new Date().toLocaleDateString()}</p>
          <p style={{ fontSize: '10px', color: '#52525b', fontWeight: '700', letterSpacing: '0.1em' }}>APP版權: 國土永續研究教育基金會</p>
        </div>
      </div>
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mb-2 sm:mb-8 flex flex-col items-center relative landscape:hidden lg:landscape:flex"
      >
        <button 
          onClick={() => setMuted(!muted)}
          className="absolute right-0 top-0 p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter mb-1 flex items-center gap-2 sm:gap-3">
          經典綠白棋
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-pulse" />
        </h1>
        <p className="text-zinc-500 text-[10px] sm:text-sm uppercase tracking-widest font-medium">8 × 8 策略對弈遊戲</p>
      </motion.div>

      {/* Main Game Container */}
      <div className="flex flex-col landscape:flex-row lg:flex-row gap-2 sm:gap-8 items-center lg:items-start justify-center w-full max-w-5xl">
        
        {/* Screen Flash Overlay */}
        <AnimatePresence>
          {isFlippingTable && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, times: [0, 0.5, 1] }}
              className="fixed inset-0 bg-white z-[100] pointer-events-none"
            />
          )}
        </AnimatePresence>
        
        {/* Stats Panel */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full landscape:w-48 lg:w-64 space-y-2 sm:space-y-4 order-2 lg:order-1 landscape:order-1"
        >
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-6">
              <h2 className="text-[8px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> 玩家狀態
              </h2>
              <button 
                onClick={() => setIsEditingNames(!isEditingNames)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="修改暱稱"
              >
                <Edit2 size={12} className={isEditingNames ? 'text-emerald-400' : 'text-zinc-500'} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 landscape:grid-cols-1 lg:grid-cols-1 gap-2 sm:gap-6">
              {[1, 2].map((p) => (
                <div 
                  key={p}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-xl transition-all duration-300 ${
                    currentPlayer === p && !gameOver ? 'bg-white/10 ring-1 ring-white/20' : 'opacity-40'
                  } ${gameOver ? 'ring-1 ring-red-500/30 bg-red-500/5' : ''}`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-lg ${
                      p === 1 ? 'bg-emerald-500 border-2 border-emerald-400' : 'bg-white border-2 border-zinc-300'
                    }`} />
                    <div className="flex flex-col">
                      {isEditingNames ? (
                        <input 
                          type="text"
                          value={playerNames[p as Player]}
                          onChange={(e) => setPlayerNames(prev => ({ ...prev, [p]: e.target.value }))}
                          className="bg-zinc-800 border-none rounded px-1 py-0.5 text-xs sm:text-sm font-semibold w-20 sm:w-24 focus:ring-1 focus:ring-emerald-500 outline-none"
                          maxLength={8}
                        />
                      ) : (
                        <span className="text-xs sm:text-sm font-semibold">{playerNames[p as Player]}</span>
                      )}
                      {gameOver && isStuckEnd && (
                        <span className="text-[8px] sm:text-[10px] text-red-400 font-bold animate-pulse">時間輸家</span>
                      )}
                      {gameOver && !isStuckEnd && (
                        <span className="text-[8px] sm:text-[10px] text-emerald-400 font-bold">正常勝利</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xl sm:text-2xl font-mono font-bold">{scores[p as Player]}</span>
                </div>
              ))}
            </div>
          </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={handleFlipTable}
                disabled={gameOver || isFlippingTable}
                className="w-full py-3 bg-red-900/40 hover:bg-red-800/60 disabled:opacity-30 disabled:cursor-not-allowed text-red-200 rounded-2xl border border-red-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                title="有人不玩了：宣告棄賽"
              >
                <motion.div
                  animate={isFlippingTable ? { rotate: [0, 20, -20, 0], scale: [1, 1.5, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 0.2 }}
                >
                  <Sparkles size={18} className="group-hover:text-red-400" />
                </motion.div>
                <span className="font-bold tracking-widest text-sm">有人不玩了</span>
              </button>

              <button 
                onClick={initGame}
                className="w-full py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20 text-sm sm:text-base"
              >
                <RotateCcw size={18} /> 更換對手重新開始
              </button>

              <button 
                onClick={restartSamePlayers}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm"
              >
                原班人馬再戰
              </button>
            </div>
        </motion.div>

        {/* Board Panel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isFlippingTable ? { 
            opacity: 1, 
            scale: 1,
            x: [0, -10, 10, -10, 10, 0],
            y: [0, 5, -5, 5, -5, 0]
          } : { opacity: 1, scale: 1 }}
          transition={isFlippingTable ? { duration: 0.5, repeat: 5 } : {}}
          className="relative order-1 lg:order-2 landscape:order-2 z-20"
          style={{ overflow: 'visible' }}
        >
          <div className="bg-black p-1.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-red-900/50 shadow-[inset_0_0_40px_rgba(255,0,0,0.2)] relative" style={{ overflow: 'visible' }}>
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
            <div className="grid grid-cols-8 gap-0.5 sm:gap-1 bg-red-950 relative z-10" style={{ overflow: 'visible' }}>
              {/* Vector Lines Overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 800 800">
                <AnimatePresence>
                  {activeVectors.map((v, i) => {
                    const x1 = v.from[1] * 100 + 50;
                    const y1 = v.from[0] * 100 + 50;
                    const x2 = v.to[1] * 100 + 50;
                    const y2 = v.to[0] * 100 + 50;
                    const color = v.player === 1 ? '#fbbf24' : '#3b82f6'; // yellow-400 : blue-500
                    
                    return (
                      <motion.line
                        key={`${i}-${v.from}-${v.to}`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={color}
                        strokeWidth="12"
                        strokeLinecap="round"
                        filter="blur(1px)"
                      />
                    );
                  })}
                </AnimatePresence>
              </svg>

              {board.map((row, r) => (
                row.map((cell, c) => {
                  const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
                  // If flipping table or draw, all fly.
                  const isLoserPiece = (gameOver && (winner === null ? true : cell === loser)) || isFlippingTable;
                  
                  // Calculate flip delay based on distance from last move
                  const dist = lastMove ? Math.max(Math.abs(r - lastMove.r), Math.abs(c - lastMove.c)) : 0;
                  const isRecentlyPlaced = lastMove && lastMove.r === r && lastMove.c === c && (Date.now() - lastMove.time < 1000);
                  const flipDelay = isRecentlyPlaced ? 0 : dist * 0.08;
                  
                  return (
                    <div 
                      key={`${r}-${c}`}
                      onClick={() => isValid && handleMove(r, c)}
                      className="w-[11vw] h-[11vw] landscape:w-[10vh] landscape:h-[10vh] max-w-[56px] max-h-[56px] bg-black flex items-center justify-center relative cursor-pointer group shadow-[inset_0_0_12px_rgba(255,0,0,0.1)]"
                    >
                      {/* Cell Grid Lines & Texture */}
                      <div className="absolute inset-0 border-t border-l border-red-500/20 pointer-events-none" />
                      <div className="absolute inset-0 border-b border-r border-red-900/40 pointer-events-none" />
                      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(#ffffff_0.5px,transparent_0.5px)] [background-size:4px_4px]" />
                      
                      {/* Valid Move Indicator */}
                      {isValid && !gameOver && (
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white/40 group-hover:bg-white/60 transition-colors shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                      )}

                      {/* Piece */}
                      {cell && (
                        <div className="w-full h-full relative" style={{ overflow: 'visible' }}>
                          <motion.div
                            key={`${gameId}-${r}-${c}-${cell === null ? 'empty' : 'piece'}`}
                            initial={{ scale: 0, rotateY: 180 }}
                            animate={isLoserPiece ? {
                              scale: [0.85, 1.2, 0],
                              rotate: [0, 360],
                              opacity: [1, 0.8, 0],
                              filter: ["brightness(1)", "brightness(2)", "brightness(4)"],
                            } : { 
                              scale: 0.85, 
                              rotateY: cell === 1 ? 0 : 180 
                            }}
                            transition={isLoserPiece ? {
                              duration: 0.6,
                              ease: "easeOut",
                              delay: Math.random() * 0.8
                            } : { 
                              rotateY: { duration: 0.5, ease: "easeInOut", delay: flipDelay },
                              scale: { type: 'spring', stiffness: 300, damping: 25, delay: lastMove ? 0 : (r + c) * 0.05 }
                            }}
                            className="w-full h-full relative"
                            style={{ transformStyle: 'preserve-3d' }}
                          >
                            {/* Green Side (formerly Black) */}
                            <div 
                              className="absolute inset-0 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-700 border-2 border-emerald-300"
                              style={{ backfaceVisibility: 'hidden' }}
                            />
                            {/* White Side */}
                            <div 
                              className="absolute inset-0 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-white to-zinc-200 border-2 border-zinc-300"
                              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                            />
                          </motion.div>

                          {/* Tombstone Cross (Loser's color) */}
                          {isLoserPiece && (
                            <div className="absolute inset-0 pointer-events-none z-[9999] flex items-center justify-center" style={{ overflow: 'visible' }}>
                              <motion.div
                                initial={{ scale: 0, opacity: 0, y: 0 }}
                                animate={{ 
                                  scale: [0, 1.2, 1], 
                                  opacity: [0, 1, 0.8],
                                  y: -30,
                                  rotate: [0, -10, 10, 0]
                                }}
                                transition={{ 
                                  duration: 2, 
                                  ease: "easeOut",
                                  delay: Math.random() * 0.5
                                }}
                                className={`relative w-8 h-12 ${cell === 1 ? 'text-emerald-500' : 'text-white'}`}
                              >
                                {/* Tombstone Base Glow */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-current opacity-20 rounded-full blur-md" />
                                {/* Vertical Bar */}
                                <div className="absolute left-1/2 -translate-x-1/2 w-2 h-12 bg-current rounded-t-sm shadow-[0_0_15px_currentColor]" />
                                {/* Horizontal Bar */}
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-2 bg-current rounded-sm shadow-[0_0_15px_currentColor]" />
                              </motion.div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </div>

          {/* Skip Turn Notification */}
          <AnimatePresence>
            {isSkipping && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="absolute -top-16 left-0 right-0 flex justify-center z-20"
              >
                <div className="bg-amber-500 text-black px-4 py-2 rounded-2xl text-xs font-bold shadow-xl flex flex-col items-center gap-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-amber-500 px-1.5 py-0.5 rounded text-[8px] tracking-tighter">AUTO</span>
                    <Info size={14} />
                    系統自動跳過 {isSkipping === 1 ? '綠方' : '白方'} 回合...
                  </div>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="h-0.5 bg-black/20 w-full absolute bottom-0 left-0"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Over Overlay */}
          <AnimatePresence>
            {showOverlay && (
              <motion.div 
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl sm:rounded-3xl bg-black/60"
              >
                <motion.div 
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-zinc-900 border border-white/10 p-4 sm:p-8 rounded-3xl text-center shadow-2xl max-w-[200px] sm:max-w-[280px] landscape:max-w-[240px]"
                >
                  <Trophy className={`mx-auto mb-2 sm:mb-4 ${isFlippingTable ? 'text-orange-500' : isStuckEnd ? 'text-red-500' : 'text-emerald-500'}`} size={32} />
                  <h3 className={`text-lg sm:text-2xl font-bold mb-1 sm:mb-2 tracking-tighter ${isFlippingTable ? 'text-orange-500' : isStuckEnd ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isFlippingTable ? '有人不玩了' : isStuckEnd ? '時間的終點' : '棋盤的圓滿'}
                  </h3>
                  <p className="text-[10px] sm:text-sm text-zinc-400 mb-4 sm:mb-6 leading-relaxed">
                    {isFlippingTable ? (
                      "棋局因宣告而終止，萬物化作彩虹閃光消逝。"
                    ) : isStuckEnd ? (
                      winner === null 
                        ? "兩位玩家皆成為時間輸家，平手收場。" 
                        : `玩家 ${winner} 雖然獲勝，但時間已逝。`
                    ) : (
                      winner === null
                        ? "棋盤圓滿，雙方勢均力敵。"
                        : `玩家 ${winner} 在圓滿的棋盤上獲得勝利！`
                    )}
                  </p>
                  <button 
                    onClick={initGame}
                    className={`w-full py-3 text-white rounded-xl font-bold transition-colors text-sm sm:text-base shadow-lg ${
                      isFlippingTable
                        ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/40'
                        : isStuckEnd 
                        ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40' 
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                    }`}
                  >
                    {isFlippingTable ? '更換對手重整旗鼓' : isStuckEnd ? '更換對手重啟輪迴' : '更換對手再戰一局'}
                  </button>

                  <button 
                    onClick={restartSamePlayers}
                    className="w-full mt-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors text-sm sm:text-base"
                  >
                    原班人馬再戰
                  </button>
                  
                  <button 
                    onClick={exportRecord}
                    disabled={isExporting}
                    className="w-full mt-2 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                  >
                    {isExporting ? (
                      <span className="animate-pulse">正在匯出...</span>
                    ) : (
                      <>
                        <Download size={18} /> 匯出遊戲紀錄圖
                      </>
                    )}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Victory Banner (Non-blocking) */}
          <AnimatePresence>
            {gameOver && !showOverlay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: -100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="absolute -top-24 sm:-top-32 left-0 right-0 flex flex-col items-center z-40 pointer-events-none landscape:-top-16 lg:landscape:-top-32"
              >
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`px-8 py-3 rounded-2xl shadow-lg border border-white/20 ${
                    winner === null 
                      ? 'bg-gradient-to-r from-zinc-600 to-zinc-500 shadow-zinc-900/50' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-900/50'
                  }`}
                >
                  <h2 className="text-2xl sm:text-3xl font-black tracking-widest italic">
                    {winner === null ? 'DRAW!' : 'VICTORY!'}
                  </h2>
                </motion.div>
                <p className={`mt-4 font-bold tracking-widest text-sm animate-pulse ${
                  winner === null ? 'text-zinc-400' : 'text-emerald-400'
                }`}>
                  {winner === null ? '棋逢敵手，難分高下' : `${winner === 1 ? '綠方' : '白方'} 展現了壓倒性的實力`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Screen Victory Crosses */}
          {gameOver && Array.from({ length: 15 }).map((_, i) => (
            <VictoryCross key={i} color={winner === 1 ? 'text-emerald-400' : 'text-white'} />
          ))}
        </motion.div>

      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 sm:mt-12 text-zinc-600 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-bold"
      >
      </motion.div>
    </div>
  );
}
