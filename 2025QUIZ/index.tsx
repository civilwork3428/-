
import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- Types & Constants ---
interface Question {
  id: number;
  text: string;
  options?: string[];
  type: 'player' | 'quiz';
  correctAnswer?: string;
  placeholder?: string;
}

const QUESTIONS: Question[] = [
  { id: 0, text: "請問玩家姓名是?", type: 'player', placeholder: "請輸入您的姓名" },
  { id: 1, text: "1. 2025年7月台灣首度實施整合萬安與民安的演習名稱為？", options: ["1. 全民大逃殺", "2. 城鎮韌性演習", "3. 萬民保平安", "4. 韌性城市週"], type: 'quiz', correctAnswer: "2. 城鎮韌性演習" },
  { id: 2, text: "2. 2025年7月重創南台灣（嘉義台南）導致防空演習取消的颱風是？", options: ["1. 丹娜絲", "2. 凱米", "3. 格美", "4. 摩羯"], type: 'quiz', correctAnswer: "2. 凱米" },
  { id: 3, text: "3. 2025年底台北隨機傷人事件引發呼籲，哪種設備旁應增設「止血包」？", options: ["1. 自動販賣機", "2. AED (心臟去顫器)", "3. 消防栓", "4. 垃圾桶"], type: 'quiz', correctAnswer: "2. AED (心臟去顫器)" },
  { id: 4, text: "4. 2025年7月俄羅斯堪察加強震，台灣部分地區收到了什麼警訊演練？", options: ["1. 火山噴發警報", "2. 海嘯警報", "3. 隕石警報", "4. 喪屍警報"], type: 'quiz', correctAnswer: "2. 海嘯警報" },
  { id: 5, text: "5. 2025年國家防災日（9/21）的演練主軸是什麼？", options: ["1. 巨震求生，強韌整備", "2. 全台一起趴下", "3. 水災防禦", "4. AI 防災"], type: 'quiz', correctAnswer: "1. 巨震求生，強韌整備" },
  { id: 6, text: "6. 新制演習中，若人在室外聽到警報且無建築物，應尋找何處掩蔽？", options: ["1. 大樹下", "2. 電線桿旁", "3. 地下道、涵洞或橋墩", "4. 郵筒後面"], type: 'quiz', correctAnswer: "3. 地下道、涵洞或橋墩" },
  { id: 7, text: "7. 防空演習期間，如果你正在開車，正確的做法是？", options: ["1. 加速衝回家", "2. 留在車內鎖門", "3. 靠邊停車並下車避難", "4. 停在路中央"], type: 'quiz', correctAnswer: "3. 靠邊停車並下車避難" },
  { id: 8, text: "8. 2025年防災新知提到，防空避難的最標準姿勢是什麼？", options: ["1. 挺胸立正看天空", "2. 趴下、手抱頭、閉眼", "3. 跪姿掩眼耳、嘴微張", "4. 側躺捲曲身體"], type: 'quiz', correctAnswer: "3. 跪姿掩眼耳、嘴微張" },
  { id: 9, text: "9. 防災專家建議避難姿勢要「遮眼、摀耳、嘴微張」是為了？", options: ["1. 不讓人認出你", "2. 防止衝擊波傷及眼耳內臟", "3. 比較帥氣", "4. 怕沙塵飛進去"], type: 'quiz', correctAnswer: "2. 防止衝擊波傷及眼耳內臟" },
  { id: 10, text: "10. 在溪邊露營發現水流變混濁且夾雜草木，這代表什麼前兆？", options: ["1. 有人洗衣服", "2. 魚群大遷徙", "3. 山洪暴發應立刻撤離", "4. 泥巴浴時間"], type: 'quiz', correctAnswer: "3. 山洪暴發應立刻撤離" },
  { id: 11, text: "11. 居家緊急避難包裡，下列哪一樣東西「最不建議」放入？", options: ["1. 哨子", "2. 兩公升瓶裝紅酒", "3. 行動電源", "4. 手電筒與電池"], type: 'quiz', correctAnswer: "2. 兩公升瓶裝紅酒" },
  { id: 12, text: "12. 如果發生地震人在辦公室，正確的第一動作是？", options: ["1. 衝進電梯逃生", "2. 趴下、掩護、穩住", "3. 拍發 Threads", "4. 跑到窗戶邊"], type: 'quiz', correctAnswer: "2. 趴下、掩護、穩住" },
  { id: 13, text: "13. 2025年推動的「韌性社區」，強調應具備「自主維生」幾天的能力？", options: ["1. 1 天", "2. 3 天以上", "3. 30 天", "4. 半年"], type: 'quiz', correctAnswer: "2. 3 天以上" },
  { id: 14, text: "14. 室內防空避難的「遠離外牆原則」是指躲在何處？", options: ["1. 陽台吹風", "2. 與爆炸源隔兩道牆的內側", "3. 落地窗旁邊", "4. 大門門框下"], type: 'quiz', correctAnswer: "2. 與爆炸源隔兩道牆的內側" },
  { id: 15, text: "15. 若台北燈節主燈被強風吹落，最安全的應對方式是？", options: ["1. 拿出手機合照", "2. 反方向蹲下並保護頭部", "3. 徒手擋住它", "4. 站在原地尖叫"], type: 'quiz', correctAnswer: "2. 反方向蹲下並保護頭部" },
];

const QuizApp: React.FC = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [inputValue, setInputValue] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleAnswer = (val: string) => {
    const newAnswers = { ...answers, [QUESTIONS[step].id]: val };
    setAnswers(newAnswers);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      setInputValue('');
    } else {
      setStep(QUESTIONS.length);
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    const quizQuestions = QUESTIONS.filter(q => q.type === 'quiz');
    quizQuestions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount += 1;
      }
    });
    // 總分 100，每題分數相同
    return Math.round((correctCount / quizQuestions.length) * 100);
  };

  const exportToDoc = () => {
    const score = calculateScore();
    const playerName = answers[0] || "無名氏";
    const dateStr = new Date().toLocaleDateString();
    
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>2025 防災能力測驗結果</title>
      <style>
        body { font-family: 'PingFang TC', 'Microsoft JhengHei', sans-serif; padding: 20px; color: #1e293b; }
        .header { text-align: center; font-size: 26pt; font-weight: bold; margin-bottom: 20pt; border-bottom: 4px double #1e3a8a; padding-bottom: 10pt; color: #1e3a8a; }
        .meta { margin-bottom: 20pt; font-size: 14pt; border-left: 5px solid #1e3a8a; padding-left: 10pt; }
        .question { margin-top: 15pt; font-weight: bold; font-size: 12pt; background-color: #f1f5f9; padding: 8pt; border-radius: 4pt; }
        .answer { margin-bottom: 5pt; color: #334155; margin-left: 20pt; font-size: 11pt; }
        .score-box { border: 5px solid #ef4444; width: 160pt; margin: 30pt auto; padding: 20pt; text-align: center; color: #ef4444; border-radius: 10pt; }
        .score-val { font-size: 48pt; font-weight: 900; line-height: 1; }
        .footer { margin-top: 40pt; text-align: center; font-size: 10pt; color: #94a3b8; }
      </style>
      </head>
      <body>
        <div class="header">2025 全民防災暨韌性演習評核報告</div>
        <div class="meta">
          受試人員：${playerName} <br/>
          評核日期：${dateStr} <br/>
          評核單位：韌性城市應變指揮中心
        </div>
        <div class="score-box">
           <div style="font-weight:bold; font-size:14pt;">核定總分</div>
           <div class="score-val">${score}</div>
           <div style="letter-spacing: 5pt;">POINTS</div>
        </div>
        ${QUESTIONS.filter(q => q.type === 'quiz').map(q => `
          <div class="question">${q.text}</div>
          <div class="answer">您的選擇：${answers[q.id] || '未作答'}</div>
          <div class="answer" style="color:${answers[q.id] === q.correctAnswer ? '#059669' : '#dc2626'}">判定：${answers[q.id] === q.correctAnswer ? '✔ 正確' : '✘ 錯誤'}</div>
          <div class="answer" style="font-style: italic; color: #64748b;">正確答案：${q.correctAnswer}</div>
        `).join('')}
        <div class="footer">
          本報告由系統自動生成，用於個人防災意識評核參考。<br/>
          國土永續研究教育基金會2026年版 | 僅供公益宣導與教育使用，未經授權不得商業轉售。
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `防災能力報告_${playerName}.doc`;
    link.click();
  };

  const exportToImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 增加高度以容納 15 題
    const width = 1200;
    const height = 2200; 
    canvas.width = width;
    canvas.height = height;

    const primaryColor = '#1e3a8a'; 

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Title Section
    ctx.fillStyle = primaryColor;
    ctx.textAlign = 'center';
    ctx.font = 'bold 70px "Noto Serif TC", sans-serif';
    ctx.fillText('2025 全民防災與韌性演習', width / 2, 180);
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('專業能力評核成績單', width / 2, 260);
    
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(100, 310);
    ctx.lineTo(width - 100, 310);
    ctx.stroke();

    // Info
    const playerName = answers[0] || "無名氏";
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(`受試人員：${playerName}`, 120, 400);
    ctx.fillText(`評核日期：${new Date().toLocaleDateString()}`, 120, 470);

    // Score Stamp
    const score = calculateScore();
    ctx.save();
    ctx.translate(width - 280, 420);
    ctx.rotate(-0.15);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.strokeRect(-140, -90, 280, 180);
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('核定等第', 0, -45);
    ctx.font = 'black 100px sans-serif';
    ctx.fillText(score.toString(), 0, 50);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('FINAL SCORE', 0, 80);
    ctx.restore();

    // Table Header
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(100, 580, width - 200, 70);
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('測試項目 (防災應變能力)', 130, 625);
    ctx.textAlign = 'right';
    ctx.fillText('評定結果', width - 130, 625);

    // Results List
    let y = 720;
    ctx.textAlign = 'left';
    QUESTIONS.filter(q => q.type === 'quiz').forEach((q) => {
      const isCorrect = answers[q.id] === q.correctAnswer;
      
      // Question text wrap or truncate
      ctx.fillStyle = '#334155';
      ctx.font = '24px sans-serif';
      let displayText = q.text.length > 40 ? q.text.substring(0, 40) + '...' : q.text;
      ctx.fillText(displayText, 120, y);
      
      // Pass/Fail Mark
      ctx.textAlign = 'right';
      ctx.fillStyle = isCorrect ? '#059669' : '#dc2626';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(isCorrect ? '【 通過 】' : '【 待加強 】', width - 120, y);
      
      ctx.textAlign = 'left';
      y += 85;
    });

    // Copyright Notice
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('國土永續研究教育基金會2026年版', 120, height - 250);
    ctx.fillText('僅供公益宣導與教育使用，未經授權不得商業轉售。', 120, height - 220);

    // Final Footer
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.font = 'italic 22px sans-serif';
    ctx.fillText('※ 本成績單僅供防災韌性演習成效評核，不作為法律訴訟之證明。', width / 2, height - 100);

    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `防災評核成績單_${playerName}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    }, 150);
  };

  const currentQ = QUESTIONS[step];

  if (step === QUESTIONS.length) {
    const score = calculateScore();
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 text-slate-900 animate-in fade-in duration-700">
        <header className="w-full max-w-2xl text-center mb-8 mt-4">
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-blue-900 tracking-tight">防災韌性評核報告書</h1>
          <div className="h-1 w-24 bg-red-600 mx-auto mt-3"></div>
        </header>

        <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 sm:p-10 border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 sm:p-8">
             <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-red-500 flex flex-col items-center justify-center -rotate-12 opacity-90 bg-white/50 backdrop-blur-sm">
                <span className="text-red-500 font-bold text-[10px] sm:text-xs">評定得分</span>
                <span className="text-red-600 font-black text-3xl sm:text-4xl">{score}</span>
             </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between border-b pb-4">
               <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Player Name</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-800">{answers[0]}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Report Date</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
               </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm italic mb-4">
                系統備註：本測驗共有 15 道關鍵防災題目，您的評核結果如下：
              </div>
              {QUESTIONS.filter(q => q.type === 'quiz').map((q) => {
                const isCorrect = answers[q.id] === q.correctAnswer;
                return (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-lg border-l-4 transition-all" style={{ borderLeftColor: isCorrect ? '#10b981' : '#f43f5e' }}>
                    <p className="text-xs font-bold text-slate-500 mb-1 leading-relaxed">{q.text}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm">
                         回答：<span className={isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{answers[q.id] || '未填'}</span>
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {isCorrect ? 'Pass' : 'Fail'}
                      </span>
                    </div>
                    {!isCorrect && <p className="text-[11px] text-slate-400 mt-2 border-t pt-1 italic">標準解答：{q.correctAnswer}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl mt-8 mb-10">
          <button onClick={() => setStep(0)} className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all shadow-md">返回重測</button>
          <button onClick={exportToDoc} className="flex-1 py-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg>
            匯出 .DOC
          </button>
          <button onClick={exportToImage} className="flex-1 py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path></svg>
            匯出 .JPG
          </button>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 sm:p-6 font-sans select-none text-slate-800">
      {/* Progress */}
      <div className="w-full max-w-md mb-8 mt-2">
        <div className="flex justify-between items-end mb-2">
          <span className="text-blue-900 text-[10px] font-bold uppercase tracking-widest">Examination Progress</span>
          <span className="text-blue-900 text-2xl font-serif italic font-bold">{step + 1}<span className="text-slate-300 text-lg mx-1">/</span>{QUESTIONS.length}</span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-blue-700 transition-all duration-500 ease-out" 
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white flex flex-col items-center min-h-[580px] relative transition-all animate-in zoom-in-95 duration-300">
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-[10px] font-bold mb-8 self-start tracking-widest uppercase">
          {currentQ.type === 'player' ? 'Verification' : `Unit Test - ${currentQ.id}`}
        </div>
        
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-800 text-center mb-10 leading-relaxed px-2">
          {currentQ.text}
        </h2>

        {currentQ.type === 'player' ? (
          <div className="w-full space-y-6">
            <div className="relative">
               <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inputValue.trim() && handleAnswer(inputValue.trim())}
                placeholder={currentQ.placeholder}
                className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none rounded-2xl py-5 px-6 text-lg transition-all placeholder:text-slate-300 shadow-sm"
                autoFocus
              />
            </div>
            <button
              onClick={() => inputValue.trim() && handleAnswer(inputValue.trim())}
              disabled={!inputValue.trim()}
              className="w-full py-5 px-6 rounded-2xl bg-blue-800 text-white text-lg font-bold shadow-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              開啟評核系統
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
              根據《全民防衛動員準備法》相關規範，<br/>請確實輸入受試者姓名以利系統建檔核備。
            </p>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {currentQ.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="w-full py-4 px-6 rounded-2xl text-left text-base sm:text-lg font-medium transition-all border-2 border-slate-50 hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98] bg-white group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-700 group-hover:text-white flex items-center justify-center mr-4 text-xs font-black transition-colors shrink-0">
                    {opt.substring(0, 1)}
                  </div>
                  <span className="flex-1 text-slate-700 group-hover:text-blue-900 leading-tight">
                    {opt.includes('. ') ? opt.split('. ')[1] : (opt.length > 2 ? opt.substring(2) : opt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Branding */}
        <div className="mt-auto pt-10 opacity-30 text-[9px] font-bold tracking-[0.2em] text-slate-400 text-center uppercase">
          Department of Resilience & Emergency Preparedness<br/>
          Standard Assessment v2.5.0
        </div>
        
        {/* Copyright */}
        <div className="mt-4 text-[10px] text-slate-400 text-center opacity-60">
          <p>國土永續研究教育基金會2026年版</p>
          <p>僅供公益宣導與教育使用，未經授權不得商業轉售。</p>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<QuizApp />);
}
