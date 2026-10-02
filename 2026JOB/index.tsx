
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'https://esm.sh/xlsx';

// --- Types & Constants ---
interface Question {
  id: number;
  text: string;
  options: string[];
  type: 'single' | 'multi' | 'text' | 'date-choice' | 'short-text';
  placeholder?: string;
}

// Fix: Define HistoryEntry type to handle both numeric question IDs and the special finalDate property
type HistoryEntry = {
  [key: number]: any;
  finalDate?: string;
};

const QUESTIONS: Question[] = [
  { id: 1, text: "日期", options: ["今天", "回溯某日"], type: 'date-choice' },
  { id: 5, text: "上午業務", options: [], type: 'short-text', placeholder: "概述..." },
  { id: 7, text: "下午業務", options: [], type: 'short-text', placeholder: "概述..." },
  { id: 9, text: "晚上業務", options: [], type: 'short-text', placeholder: "概述..." },
  { id: 18, text: "今日小結", options: [], type: 'text', placeholder: "..." },
  { id: 19, text: "填表人", options: [], type: 'short-text', placeholder: "姓名" },
];

const STATUS_LIGHTS = [
  { icon: "🟢", label: "綠燈", desc: "暫時穩定，我還行", color: "emerald" },
  { icon: "🟡", label: "黃燈", desc: "輕微落後，支援我", color: "amber" },
  { icon: "🔴", label: "紅燈", desc: "嚴重落後，救命啊", color: "rose" },
];

const JournalApp: React.FC = () => {
  const [step, setStep] = useState<number | 'home' | 'weekly'>( 'home' );
  const [answers, setAnswers] = useState<Record<number, any>>({});
  // Fix: Use HistoryEntry[] for history state to allow property access like finalDate
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [backtrackDate, setBacktrackDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hideMissingDays, setHideMissingDays] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('battle_logs');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToArchive = () => {
    const logDate = answers[1] === "今天" ? new Date().toISOString().split('T')[0] : answers[1];
    const dataToSave: HistoryEntry = { ...answers, finalDate: logDate };
    let newHistory = [...history];
    if (editingIndex !== null) newHistory.splice(editingIndex, 1);
    // Fix: finalDate access is now valid on HistoryEntry
    newHistory = newHistory.filter(h => (h.finalDate || h[1]) !== logDate);
    newHistory = [dataToSave, ...newHistory].slice(0, 31);
    localStorage.setItem('battle_logs', JSON.stringify(newHistory));
    setHistory(newHistory);
    alert('戰報已轉錄至存檔庫！');
    setStep('home');
    setAnswers({});
    setEditingIndex(null);
  };

  const getWeeklyCalendar = () => {
    if (history.length === 0) return [];
    // Fix: Accessing finalDate on the first element of history
    const latestDateStr = history[0].finalDate || history[0][1];
    const latest = new Date(latestDateStr === "今天" ? new Date() : latestDateStr);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(latest);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      // Fix: finalDate access inside find callback
      const found = history.find(h => (h.finalDate || h[1]) === dStr);
      days.push({ date: dStr, data: found, isMissing: !found });
    }
    return hideMissingDays ? days.filter(d => !d.isMissing) : days;
  };

  // --- Export Logic ---
  
  const formatDisplayValue = (val: any, compact: boolean = false) => {
    if (!val) return '-';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object' && 'status' in val) {
      const statusIcon = STATUS_LIGHTS.find(l => l.label === val.status)?.icon || '';
      if (compact) return statusIcon;
      return `${statusIcon} ${val.status} | ${val.text || '(無概述)'}`;
    }
    return val.toString();
  };

  const exportToExcel = () => {
    const calendar = getWeeklyCalendar();
    const dataRows = QUESTIONS.map(q => {
      const row: any = { "情報項目": q.text };
      calendar.forEach(day => {
        let val = day.isMissing ? "未紀錄" : (day.data ? day.data[q.id] : "-");
        row[day.date] = formatDisplayValue(val, true);
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "週戰報轉錄");
    XLSX.writeFile(workbook, `Weekly_Transcription_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToWord = () => {
    const calendar = getWeeklyCalendar();
    let tableHtml = `<table border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 10px;">情報項</th>
          ${calendar.map(d => `<th style="padding: 10px;">${d.date}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${QUESTIONS.map(q => `
          <tr>
            <td style="padding: 8px; font-weight: bold;">${q.text}</td>
            ${calendar.map(d => {
              let val = d.isMissing ? "情報缺失" : (d.data ? d.data[q.id] : "-");
              return `<td style="padding: 8px; text-align: center;">${formatDisplayValue(val, true)}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>`;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>週度轉錄戰報</title></head>
      <body>
        <h1>週度轉錄戰報 (Transcription Report)</h1>
        <p>週期範疇：${calendar[0].date} ~ ${calendar[calendar.length-1].date}</p>
        <p>執行官：${(history.length > 0 && history[0][19]) || "佚名"}</p>
        <hr/>
        ${tableHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Weekly_Report_${new Date().toISOString().split('T')[0]}.doc`;
    link.click();
  };

  const exportWeeklyReportJPG = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const calendar = getWeeklyCalendar();
    const width = 1800; 
    const rowHeight = 90;
    const headerHeight = 200;
    const labelColWidth = 350;
    const dayColWidth = (width - labelColWidth) / calendar.length;
    const height = headerHeight + (QUESTIONS.length * rowHeight) + 100;
    
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, headerHeight);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('情報轉錄矩陣畫布', width / 2, 80);

    calendar.forEach((day, i) => {
      const x = labelColWidth + (i * dayColWidth);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x, headerHeight - 50, dayColWidth, 50);
      ctx.strokeRect(x, headerHeight - 50, dayColWidth, 50);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(day.date.slice(5), x + (dayColWidth/2), headerHeight - 17);
    });

    QUESTIONS.forEach((q, rowIdx) => {
      const y = headerHeight + (rowIdx * rowHeight);
      ctx.strokeRect(0, y, labelColWidth, rowHeight);
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`${rowIdx + 1}. ${q.text}`, 20, y + (rowHeight/2) + 7);

      calendar.forEach((day, colIdx) => {
        const x = labelColWidth + (colIdx * dayColWidth);
        ctx.strokeRect(x, y, dayColWidth, rowHeight);
        if (day.isMissing || !day.data) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(x + 1, y + 1, dayColWidth - 2, rowHeight - 2);
          ctx.fillStyle = '#cbd5e1';
          ctx.textAlign = 'center';
          ctx.font = 'italic 16px sans-serif';
          ctx.fillText('[情報缺失]', x + (dayColWidth/2), y + (rowHeight/2) + 6);
        } else {
          let val = day.data[q.id];
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.font = '16px sans-serif';
          ctx.fillText(formatDisplayValue(val, true), x + (dayColWidth/2), y + (rowHeight/2) + 6);
        }
      });
    });

    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `Transcription_Matrix_${new Date().toISOString().split('T')[0]}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    }, 200);
  };

  const exportSingleJPG = (data: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const rowHeight = 100;
    const headerHeight = 150;
    const labelWidth = 200;
    const height = headerHeight + (QUESTIONS.length * rowHeight) + 80;

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('單日情報轉錄戰報', width / 2, 70);
    
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`日期：${data.finalDate || data[1]} | 執行官：${data[19] || '佚名'}`, width / 2, 110);

    // Grid
    QUESTIONS.forEach((q, i) => {
      const y = headerHeight + (i * rowHeight);
      
      // Label cell
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(50, y, labelWidth, rowHeight);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(50, y, labelWidth, rowHeight);
      
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(q.text, 70, y + (rowHeight/2) + 7);

      // Value cell
      ctx.strokeRect(50 + labelWidth, y, width - 100 - labelWidth, rowHeight);
      
      const val = data[q.id];
      const isStatus = typeof val === 'object' && val !== null && 'status' in val;
      let textColor = '#0f172a';
      let textToDraw = formatDisplayValue(val);

      if (isStatus) {
        const light = STATUS_LIGHTS.find(l => l.label === val.status);
        if (light) {
          if (light.color === 'emerald') textColor = '#059669';
          else if (light.color === 'amber') textColor = '#d97706';
          else if (light.color === 'rose') textColor = '#e11d48';
        }
        textToDraw = `${val.status} | ${val.text || '(無概述)'}`;
      }

      ctx.fillStyle = textColor;
      ctx.font = '18px sans-serif';
      
      // Simple text wrapping for long content
      const maxWidth = width - 130 - labelWidth;
      if (ctx.measureText(textToDraw).width > maxWidth) {
        ctx.fillText(textToDraw.slice(0, 25) + '...', 50 + labelWidth + 20, y + (rowHeight/2) + 7);
      } else {
        ctx.fillText(textToDraw, 50 + labelWidth + 20, y + (rowHeight/2) + 7);
      }
    });

    setTimeout(() => {
      const link = document.createElement('a');
      const dateStr = data.finalDate || (data[1] === "今天" ? new Date().toISOString().split('T')[0] : data[1]);
      link.download = `Report_${dateStr}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    }, 200);
  };

  const exportSingleWord = (data: any) => {
    let tableHtml = `<table border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 10px; width: 30%;">情報項目</th>
          <th style="padding: 10px;">內容紀錄</th>
        </tr>
      </thead>
      <tbody>
        ${QUESTIONS.map(q => {
          const val = data[q.id];
          const isStatus = typeof val === 'object' && val !== null && 'status' in val;
          let style = "";
          let displayText = formatDisplayValue(val);

          if (isStatus) {
            const light = STATUS_LIGHTS.find(l => l.label === val.status);
            let color = "black";
            if (light) {
              if (light.color === 'emerald') color = "#059669";
              else if (light.color === 'amber') color = "#d97706";
              else if (light.color === 'rose') color = "#e11d48";
            }
            style = `style="color: ${color}; font-weight: bold;"`;
            displayText = `${val.status} | ${val.text || '(無概述)'}`;
          }

          return `
          <tr>
            <td style="padding: 8px; font-weight: bold;">${q.text}</td>
            <td style="padding: 8px;" ${style}>${displayText}</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>`;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>單日轉錄戰報</title></head>
      <body>
        <h1>單日轉錄戰報 (Daily Transcription)</h1>
        <p>報告日期：${data.finalDate || data[1]}</p>
        <p>執行官：${data[19] || "佚名"}</p>
        <hr/>
        ${tableHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_${data.finalDate || data[1]}.doc`;
    link.click();
  };

  if (step === 'home') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center p-8 text-slate-100">
        <header className="text-center mb-12 mt-10">
          <h1 className="text-5xl font-black text-amber-400 mb-2 italic tracking-tighter">指揮官終端</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">Professional Data Transcription</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => { setAnswers({}); setEditingIndex(null); setStep(0); }} className="group bg-slate-900 border-2 border-slate-800 p-10 rounded-[3rem] text-center hover:border-amber-400 transition-all active:scale-95 flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-amber-400 rounded-3xl mb-6 flex items-center justify-center text-slate-950 text-4xl shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-transform group-hover:scale-110">➕</div>
            <h2 className="text-2xl font-black mb-2">錄入戰報</h2>
            <p className="text-slate-500 text-sm font-medium">6 項情報引導</p>
          </button>

          <button 
            disabled={history.length === 0}
            onClick={() => setStep('weekly')}
            className={`group bg-slate-900 border-2 border-slate-800 p-10 rounded-[3rem] text-center transition-all flex flex-col items-center shadow-2xl ${history.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:border-emerald-400 active:scale-95'}`}
          >
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl mb-6 flex items-center justify-center text-slate-950 text-4xl shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-transform group-hover:scale-110">📑</div>
            <h2 className="text-2xl font-black mb-2">導出中心</h2>
            <p className="text-slate-500 text-sm font-medium">Excel / Word / JPG</p>
          </button>
        </div>

        {history.length > 0 && (
          <div className="mt-12 w-full max-w-2xl">
            <h3 className="font-black text-slate-400 text-sm tracking-widest uppercase mb-4 px-4 flex justify-between italic">
              ARCHIVE <span>({history.length}/31)</span>
            </h3>
            <div className="space-y-3">
              {history.map((log, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">📝</span>
                    <div>
                      {/* Fix: Access finalDate safely on history element */}
                      <div className="text-white font-bold">{log.finalDate || log[1]}</div>
                      <div className="text-slate-500 text-[10px] font-bold uppercase">執行官：{log[19] || "佚名"}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setAnswers(log); setEditingIndex(i); setStep(QUESTIONS.length); }} className="p-2 bg-slate-800 rounded-lg text-amber-400 hover:bg-amber-400 hover:text-slate-950 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                    <button onClick={() => { if(confirm('刪除此筆記錄？')) { const n = [...history]; n.splice(i,1); setHistory(n); localStorage.setItem('battle_logs', JSON.stringify(n)); } }} className="p-2 bg-slate-800 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'weekly') {
    const calendarPreview = getWeeklyCalendar();
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center p-8 text-slate-100">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-black text-emerald-400 mb-2 italic tracking-tighter">矩陣導出中心</h1>
          <p className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase">Data Matrix Export Hub</p>
        </header>

        <div className="w-full max-w-5xl space-y-8 mb-20">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl">
             <div className="flex items-center justify-between mb-8 p-4 bg-slate-800/50 rounded-2xl border border-white/5">
                <div>
                   <h3 className="font-black text-white">情報預覽矩陣 (Transcription Preview)</h3>
                   <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                     {hideMissingDays ? '已啟用精簡模式：過濾無資料天數' : '全週期模式：顯示 7 日跨度'}
                   </p>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-xs font-bold text-slate-400">精簡過濾</span>
                   <button onClick={() => setHideMissingDays(!hideMissingDays)} className={`w-12 h-6 rounded-full relative transition-colors ${hideMissingDays ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hideMissingDays ? 'left-7' : 'left-1'}`} />
                   </button>
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left text-[11px] border-collapse">
                 <thead>
                   <tr className="border-b border-slate-800 text-amber-500">
                     <th className="py-2 w-1/4 uppercase tracking-tighter">情報項目</th>
                     {calendarPreview.map((d, i) => <th key={i} className="text-center p-2">{d.date.slice(5)}</th>)}
                   </tr>
                 </thead>
                 <tbody>
                   {QUESTIONS.map((q, idx) => (
                     <tr key={q.id} className="border-b border-slate-800/30">
                       <td className="py-3 text-slate-400 font-bold pr-4">{idx + 1}. {q.text}</td>
                       {calendarPreview.map((d, i) => (
                         <td key={i} className={`text-center p-2 ${d.isMissing ? 'text-slate-800 italic' : 'text-slate-200'}`}>
                           {d.isMissing || !d.data ? '✕' : formatDisplayValue(d.data[q.id], true)}
                         </td>
                       ))}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             <p className="text-[10px] text-slate-600 italic mt-4 text-center">※ 導出文件將包含全部 6 項完整情報內容</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <button onClick={exportWeeklyReportJPG} className="p-8 bg-slate-900 border-2 border-slate-800 rounded-3xl hover:border-amber-400 transition-all flex flex-col items-center group shadow-xl">
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🖼️</span>
                <span className="font-black text-xl mb-1">導出 JPG</span>
                <span className="text-[10px] text-slate-500 font-bold tracking-widest">適合快速預覽分享</span>
             </button>
             <button onClick={exportToExcel} className="p-8 bg-slate-900 border-2 border-slate-800 rounded-3xl hover:border-emerald-400 transition-all flex flex-col items-center group shadow-xl">
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">📊</span>
                <span className="font-black text-xl mb-1">導出 Excel</span>
                <span className="text-[10px] text-slate-500 font-bold tracking-widest">適合數據存檔管理</span>
             </button>
             <button onClick={exportToWord} className="p-8 bg-slate-900 border-2 border-slate-800 rounded-3xl hover:border-blue-400 transition-all flex flex-col items-center group shadow-xl">
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">📄</span>
                <span className="font-black text-xl mb-1">導出 Word</span>
                <span className="text-[10px] text-slate-500 font-bold tracking-widest">適合正式週報文檔</span>
             </button>
          </div>

          <button onClick={() => setStep('home')} className="w-full py-5 bg-slate-800 rounded-2xl font-black text-xl active:translate-y-1 transition-all">返回主終端</button>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }

  const currentStep = step as number;
  const currentQ = QUESTIONS[currentStep];

  if (currentStep === QUESTIONS.length) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 text-slate-100">
        <h1 className="text-6xl font-black text-amber-400 mb-2 mt-8 tracking-tighter italic">轉錄核對</h1>
        <div className="text-slate-500 mb-10 font-bold uppercase tracking-widest text-sm">執行官：{answers[19] || "佚名"}</div>
        <div className="w-full max-w-2xl bg-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-6 border border-slate-800 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 gap-6">
            {QUESTIONS.map((q, idx) => {
              const val = answers[q.id];
              const isStatus = typeof val === 'object' && val !== null && 'status' in val;
              let colorClass = "text-white";
              let displayText = formatDisplayValue(val);

              if (isStatus) {
                const light = STATUS_LIGHTS.find(l => l.label === val.status);
                if (light) {
                  if (light.color === 'emerald') colorClass = "text-emerald-400";
                  else if (light.color === 'amber') colorClass = "text-amber-400";
                  else if (light.color === 'rose') colorClass = "text-rose-400";
                }
                displayText = `${val.status} | ${val.text || '(無概述)'}`;
              }

              return (
                <div key={q.id} onClick={() => setStep(idx)} className="flex flex-col border-b border-slate-800 pb-4 cursor-pointer hover:bg-slate-800/50 p-4 rounded-2xl transition-colors group">
                  <span className="text-slate-500 text-sm font-black uppercase group-hover:text-amber-400 transition-colors">{idx + 1}. {q.text}</span>
                  <span className={`${colorClass} font-bold text-2xl mt-1`}>{displayText}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-6 w-full max-w-lg mt-12 mb-20">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => exportSingleJPG(answers)} className="py-4 bg-slate-800 text-amber-400 rounded-2xl font-black text-xl border-2 border-slate-700 hover:border-amber-400 transition-all flex items-center justify-center gap-2">
              <span>🖼️</span> 輸出 JPG
            </button>
            <button onClick={() => exportSingleWord(answers)} className="py-4 bg-slate-800 text-blue-400 rounded-2xl font-black text-xl border-2 border-slate-700 hover:border-blue-400 transition-all flex items-center justify-center gap-2">
              <span>📄</span> 輸出 DOC
            </button>
          </div>
          <button onClick={saveToArchive} className="w-full py-7 bg-emerald-500 text-slate-950 rounded-[2rem] font-black text-4xl border-b-8 border-emerald-800 shadow-xl active:translate-y-2">確認存檔</button>
          <button onClick={() => setStep('home')} className="w-full py-5 bg-slate-800 rounded-2xl font-bold text-xl active:translate-y-1">返回</button>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 text-slate-200">
      <div className="w-full max-w-md mb-12">
        <div className="flex justify-between items-end mb-3">
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Operational Phase</span>
          <span className="text-amber-400 text-3xl font-black italic">{currentStep + 1}<span className="text-slate-700 text-xl mx-1">/</span>{QUESTIONS.length}</span>
        </div>
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-[2px]">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-white/5 flex flex-col items-center min-h-[520px] relative">
        <div className="bg-amber-400/10 text-amber-400 px-4 py-1 rounded-full text-xs font-black mb-6 self-start tracking-widest uppercase">Phase {currentStep + 1}</div>
        <h2 className="text-5xl font-black text-white text-center mb-12 leading-tight px-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{currentQ.text}</h2>

        {currentQ.type === 'date-choice' && (
          <div className="w-full space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {currentQ.options.map((opt) => (
                <button 
                  key={opt} 
                  onClick={() => setAnswers({ ...answers, [currentQ.id]: opt })} 
                  className={`py-6 rounded-2xl text-3xl font-black border-b-4 transition-all ${answers[1] === opt ? 'bg-amber-500 text-slate-950 border-amber-800 translate-y-1' : 'bg-slate-800 text-slate-400 border-slate-950'}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {answers[1] && (
              <div className="bg-slate-800/50 p-6 rounded-3xl border-2 border-amber-500/30">
                <label className="block text-amber-400 text-sm font-black uppercase tracking-widest mb-3 text-center">
                  {answers[1] === "今天" ? "已確認日期" : "請指定回溯日期"}
                </label>
                
                {answers[1] === "今天" ? (
                  <div className="text-white text-5xl font-black text-center py-2 tracking-tighter">
                    {new Date().toISOString().split('T')[0]}
                  </div>
                ) : (
                  <input 
                    type="date" 
                    value={answers[1] === "今天" ? backtrackDate : (answers[1] || backtrackDate)} 
                    onChange={(e) => {setAnswers({...answers, 1: e.target.value});}} 
                    className="w-full bg-slate-900 text-white rounded-xl p-5 text-4xl font-black border-2 border-amber-500 text-center outline-none focus:ring-4 ring-amber-400/20" 
                  />
                )}
                
                <div className="mt-4 text-slate-500 text-xs text-center font-bold">
                  目前狀態：{answers[1]}
                </div>
              </div>
            )}

            <button 
              disabled={!answers[1]}
              onClick={() => setStep(currentStep + 1)} 
              className={`w-full mt-4 py-6 rounded-2xl font-black text-3xl border-b-4 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] ${!answers[1] ? 'bg-slate-800 text-slate-600 border-slate-900 opacity-50 cursor-not-allowed' : 'bg-white text-slate-950 active:translate-y-1'}`}
            >
              確認並繼續
            </button>
          </div>
        )}

        {currentQ.type === 'single' && (
          <div className="w-full space-y-4">
            {currentQ.options.map((opt) => (
              <button key={opt} onClick={() => { setAnswers(prev => ({ ...prev, [currentQ.id]: opt })); setStep(step + 1); }} className={`w-full py-6 rounded-2xl text-2xl font-black transition-all border-b-4 ${answers[currentQ.id] === opt ? 'bg-amber-500 text-slate-950 border-amber-800 translate-y-1' : 'bg-slate-800 text-slate-300 border-slate-950'}`}>{opt}</button>
            ))}
          </div>
        )}

        {currentQ.type === 'multi' && (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {currentQ.options.map((opt) => {
                const isSelected = (answers[currentQ.id] || []).includes(opt);
                return (
                  <button key={opt} onClick={() => {
                    setAnswers(prev => {
                      const current = prev[currentQ.id] || [];
                      const next = current.includes(opt) ? current.filter((v: string) => v !== opt) : [...current, opt];
                      return { ...prev, [currentQ.id]: next };
                    });
                  }} className={`py-6 rounded-2xl text-xl font-black border-b-4 ${isSelected ? 'bg-emerald-500 text-slate-950 border-emerald-800 translate-y-1' : 'bg-slate-800 text-slate-400 border-slate-950'}`}>{isSelected ? '✓ ' : ''}{opt}</button>
                );
              })}
            </div>
            <button onClick={() => setStep(currentStep + 1)} className="w-full mt-8 py-5 bg-white text-slate-950 rounded-2xl font-black text-2xl border-b-4 active:translate-y-1">下一步</button>
          </div>
        )}

        {(currentQ.type === 'short-text' || currentQ.type === 'text') && (
          <div className="w-full flex flex-col gap-4">
            {[5, 7, 9].includes(currentQ.id) && (
              <div className="grid grid-cols-1 gap-2 mb-2">
                {STATUS_LIGHTS.map((light) => {
                  const currentVal = answers[currentQ.id] || { text: '', status: '' };
                  const isSelected = typeof currentVal === 'object' && currentVal.status === light.label;
                  return (
                    <button
                      key={light.label}
                      onClick={() => setAnswers({ ...answers, [currentQ.id]: { ...currentVal, status: light.label } })}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                        isSelected 
                          ? `bg-${light.color}-500/20 border-${light.color}-500 text-white` 
                          : 'bg-slate-800 border-transparent text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{light.icon}</span>
                        <div>
                          <span className="text-xl font-black block">{light.label}</span>
                          <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">{light.desc}</span>
                        </div>
                      </div>
                      {isSelected && <span className="text-2xl">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <textarea 
              className={`w-full ${currentQ.type === 'text' ? 'h-48' : 'h-32'} bg-slate-800 rounded-2xl p-6 text-white font-bold border-2 border-slate-700 focus:border-amber-400 outline-none text-2xl transition-all shadow-inner`} 
              placeholder={currentQ.placeholder} 
              value={typeof (answers[currentQ.id]) === 'object' ? (answers[currentQ.id]?.text || '') : (answers[currentQ.id] || '')} 
              onChange={(e) => {
                if ([5, 7, 9].includes(currentQ.id)) {
                  const currentVal = answers[currentQ.id] || { text: '', status: '' };
                  setAnswers({ ...answers, [currentQ.id]: { ...currentVal, text: e.target.value } });
                } else {
                  setAnswers({ ...answers, [currentQ.id]: e.target.value });
                }
              }} 
            />
            <button onClick={() => setStep(currentStep + 1)} className="w-full py-6 bg-amber-500 text-slate-950 rounded-2xl font-black text-4xl border-b-4 border-amber-800 shadow-xl active:translate-y-1">{currentStep === QUESTIONS.length - 1 ? '預覽結果' : '下一步'}</button>
          </div>
        )}
      </div>

      <div className="w-full max-w-md mt-10">
        <div className="grid grid-cols-3 gap-3 px-2">
          {QUESTIONS.map((q, idx) => {
            const isCurrent = idx === currentStep;
            const val = answers[q.id];
            const isAnswered = val !== undefined && val !== null && val !== "" && (Array.isArray(val) ? val.length > 0 : true);
            
            return (
              <button
                key={q.id}
                onClick={() => setStep(idx)}
                className={`h-12 rounded-xl text-[11px] font-black transition-all flex items-center justify-center border-2 ${
                  isCurrent 
                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105 z-10' 
                    : isAnswered 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' 
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {q.text}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={() => setStep(currentStep > 0 ? currentStep - 1 : 'home')} className="mt-8 text-slate-600 font-black hover:text-slate-300 py-4 px-8 text-xs tracking-[0.4em] uppercase transition-colors">← 返回</button>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<JournalApp />);
}
