/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, 
  Download, 
  ShieldCheck, 
  Leaf, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toPng } from 'html-to-image';

// --- Constants ---
const EVENT_INFO = {
  name: '國土永續2026數位簽章活動',
  date: '2026 / 06 / 01',
  unit: '國土永續2026',
  subheader: '安全・可信・便捷的數位簽署體驗'
};

const COLORS = {
  primary: '#1B4332', 
  secondary: '#2D6A4F', 
  accent: '#B7E4C7',
  background: '#F7F9F2',
  border: '#D8E2DC',
};

// --- Utilities ---
const generateSerial = () => {
  const chars = 'ABCDEF0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getCurrentTimestamp = () => {
  const now = new Date();
  return now.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '/');
};

const get12DigitCode = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}`;
};

export default function App() {
  const [signature, setSignature] = useState<string | null>(null);
  const [isCertified, setIsCertified] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [certInfo, setCertInfo] = useState({
    timestamp: '',
    serial: '',
    code12: '',
    deviceInfo: ''
  });
  
  const sigCanvas = useRef<SignatureCanvas>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  // --- Fix Canvas Offset Issue ---
  useEffect(() => {
    const handleResize = () => {
      if (sigCanvas.current && !isCertified) {
        const canvas = sigCanvas.current.getCanvas();
        // Clear logic to prevent distortion on resize
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d')?.scale(ratio, ratio);
        sigCanvas.current.clear();
      }
    };

    if (!isCertified) {
      window.addEventListener('resize', handleResize);
      // Immediate adjustment with small delay for CSS layout to settle
      const timeout = setTimeout(handleResize, 10);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timeout);
      };
    }
  }, [isCertified]);

  // Clear signature
  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignature(null);
    setIsCertified(false);
    setIsAgreed(false);
  };

  // Produce Signature
  const handleProduceSignature = () => {
    if (!isAgreed) {
      alert('請先勾選本人親自簽署確認聲明');
      return;
    }

    const canvas = sigCanvas.current;
    if (!canvas || canvas.isEmpty()) {
      alert('請先在簽署區手寫姓名');
      return;
    }
    
    const now = new Date();
    const userAgent = navigator.userAgent;
    
    // 取得簽名圖片
    const signatureData = canvas.toDataURL('image/png');
    
    setSignature(signatureData);
    setCertInfo({
      timestamp: getCurrentTimestamp(),
      serial: generateSerial(),
      code12: get12DigitCode(now),
      deviceInfo: userAgent
    });
    setIsCertified(true);
    
    // 後台存証模擬 (開發者控制台可見)
    console.log('--- 數位授權存證成功 ---');
    console.log('當前用戶設備:', userAgent);
    console.log('簽署時間點:', now.toISOString());
    console.log('稽核序號:', certInfo.serial);
  };

  // Export Certificate
  const handleExport = async () => {
    if (!certificateRef.current) return;
    
    try {
      const dataUrl = await toPng(certificateRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `數位簽章憑證_${certInfo.serial.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('匯出失敗，請稍後再試');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F2] text-[#1B4332] font-sans p-4 md:p-8 flex flex-col items-center">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <Leaf className="absolute -top-10 -left-10 w-64 h-64 text-[#B7E4C7] rotate-45" />
        <Leaf className="absolute -bottom-20 -right-10 w-80 h-80 text-[#D8E2DC] -rotate-12" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl relative z-10"
      >
        {/* Header */}
        <header className="text-center mb-8 flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#081C15] tracking-tight mb-2">
            數位簽章應用 APP
          </h1>
          <p className="text-[#52796F] text-sm font-medium flex items-center gap-3">
            <span className="h-px w-8 bg-[#B7E4C7]"></span>
            {EVENT_INFO.subheader}
            <span className="h-px w-8 bg-[#B7E4C7]"></span>
          </p>
        </header>

        {/* Signature Section */}
        <div className="mb-4">
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-sm font-bold text-[#2D6A4F] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#74C69D]"></span>
              展示區 個人數位簽署
            </h2>
            <span className="text-[10px] text-[#95A5A6] bg-white px-2 py-1 rounded border border-[#D8E2DC] font-bold">SECURE SIGNATURE</span>
          </div>
          
          <div className="relative group">
            {/* The Certificate Wrapper (This is what gets exported) */}
            <div 
              ref={certificateRef}
              className={`
                relative bg-white rounded-3xl shadow-lg border border-[#D8E2DC] overflow-hidden transition-all duration-500
                ${isCertified ? 'shadow-green-100/50' : ''}
              `}
              style={{ minHeight: '420px' }}
            >
              {/* Organic Background Elements (SVG Leaves) */}
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <svg className="absolute -top-10 -right-10 w-64 h-64 text-[#B7E4C7]" fill="currentColor" viewBox="0 0 200 200">
                  <path d="M100 20C100 20 120 70 170 70C170 70 130 110 130 160C130 160 80 130 30 130C30 130 70 90 70 40C70 40 100 20 100 20Z" />
                </svg>
                <svg className="absolute -bottom-10 -left-10 w-48 h-48 text-[#D8E2DC]" fill="currentColor" viewBox="0 0 200 200" style={{ transform: 'rotate(180deg)', opacity: 0.5 }}>
                  <path d="M100 20C100 20 120 70 170 70C170 70 130 110 130 160C130 160 80 130 30 130C30 130 70 90 70 40C70 40 100 20 100 20Z" />
                </svg>
              </div>

              {/* Shield Watermark (10% Opacity) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <ShieldCheck 
                  size={280} 
                  className="text-[#2D6A4F] opacity-[0.10]" 
                  strokeWidth={1}
                />
              </div>

              {/* 12-Digit Diagonal Multi-Layer Watermark (Enhanced Density) */}
              {isCertified && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-2 select-none">
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center gap-10"
                    style={{ transform: 'rotate(-35deg) scale(1.4)' }}
                  >
                    {[1, 2, 3, 4, 5].map((row) => (
                      <div 
                        key={row}
                        className={`flex gap-12 text-5xl font-mono text-[#2D6A4F] whitespace-nowrap ${
                          row % 2 === 0 ? 'opacity-20 translate-x-32' : 'opacity-10 -translate-x-16'
                        }`}
                      >
                        {[1, 2, 3, 4].map((col) => (
                          <span key={col} className="tracking-tighter">
                            {certInfo.code12}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signature Canvas / Result Overlay */}
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
                {!isCertified ? (
                  <div className="w-full relative">
                    <SignatureCanvas 
                      ref={sigCanvas}
                      onEnd={() => setSignature(sigCanvas.current?.toDataURL() || null)}
                      canvasProps={{
                        className: "signature-canvas w-full h-[280px] cursor-crosshair",
                      }}
                      penColor="#081C15"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <p className="text-8xl italic font-serif text-[#1B4332] opacity-20" style={{ fontFamily: 'Georgia, serif' }}>
                        王小明
                      </p>
                      <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-[#2D6A4F] to-transparent mt-4 opacity-20"></div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center py-4">
                    {signature && (
                      <motion.img 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        src={signature} 
                        alt="Digital Signature" 
                        className="max-h-64 object-contain filter drop-shadow-sm"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Certificate Verification info (Bottom Right - Floating style) */}
              {isCertified && (
                <div className="absolute bottom-8 right-8 text-right bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-[#B7E4C7] shadow-sm z-20">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-end"
                  >
                    <div className="flex items-center gap-1.5 text-[#40916C] font-bold text-sm mb-1">
                      <CheckCircle2 size={16} />
                      <span>數位授權已驗證</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                      <p>簽署時間：{certInfo.timestamp}</p>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Certificate Bottom Branding (Static left corner) */}
              <div className="absolute bottom-8 left-8 z-20">
                <div className="text-[9px] md:text-[10px] text-[#95A5A6] font-medium leading-relaxed">
                  <p className="font-bold text-[#2D6A4F] text-xs mb-1">官方數位簽署憑證範式</p>
                  <p>核發單位：{EVENT_INFO.unit}</p>
                </div>
              </div>

              {/* Clear Button (Hidden in export mode) */}
              {!isCertified && (
                <button 
                  onClick={clearSignature}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-colors z-30"
                  title="重新簽名"
                >
                  <RotateCcw size={20} />
                </button>
              )}
            </div>
          </div>
          
          <p className="text-center text-sm text-[#74C69D] mt-4 font-medium flex items-center justify-center gap-2">
             「此數位簽章已與活動資訊完成綁定，可供後續查驗。」
          </p>
        </div>

        {/* Actions & Legal Declaration */}
        <div className="flex flex-col items-center justify-center gap-6 mt-8 pb-12">
          
          {!isCertified && (
            <div className="w-full max-w-lg mb-4">
              {/* Legal Warning Text */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 flex items-start gap-3">
                <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-bold block mb-1">【法律聲明與警告】</span>
                  本系統具備數位足跡追蹤功能（包含時間、設備資訊與數位特徵）。代他人簽署或偽造變造數位簽章，可能涉及刑法偽造文書罪，最高可處五年以下有期徒刑。
                </p>
              </div>

              {/* Consent Checkbox */}
              <label className="flex items-center gap-3 p-4 bg-white border border-[#D8E2DC] rounded-xl cursor-pointer hover:bg-[#F0F7F4] transition-colors group">
                <input 
                  type="checkbox" 
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#1B4332] focus:ring-[#1B4332] cursor-pointer"
                />
                <span className="text-sm font-bold text-[#1B4332] select-none">
                  本人確認由本人親自簽字，並願承擔法律責任。
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            {!isCertified ? (
              <motion.button
                whileTap={isAgreed ? { scale: 0.95 } : {}}
                onClick={handleProduceSignature}
                disabled={!isAgreed}
                className={`
                  w-full sm:w-64 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md transition-all
                  ${isAgreed ? 'bg-[#1B4332] text-white hover:bg-[#081C15] cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                `}
                id="btn-produce"
              >
                <Key size={20} />
                產製簽章
              </motion.button>
            ) : (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsCertified(false);
                  setIsAgreed(false);
                }}
                className="w-full sm:w-64 h-14 bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer"
              >
                <RefreshCw size={20} />
                重新簽署
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              disabled={!isCertified}
              className={`
                w-full sm:w-64 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border-2
                ${isCertified 
                  ? 'bg-white border-[#40916C] text-[#40916C] hover:bg-[#F0F7F4] shadow-sm cursor-pointer' 
                  : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-60'}
              `}
              id="btn-export"
            >
              <Download size={20} />
              匯出憑證
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="mt-8 py-8 flex flex-col items-center gap-4 relative z-10 w-full border-t border-[#D8E2DC]">
        <div className="text-xs text-[#95A5A6] tracking-widest uppercase font-bold">
          活動單位｜國土永續2026
        </div>
      </footer>

      {/* Global CSS for Canvas (Tailwind can't target internal canvas element sometimes) */}
      <style>{`
        .signature-canvas {
          touch-action: none;
        }
      `}</style>
    </div>
  );
}
