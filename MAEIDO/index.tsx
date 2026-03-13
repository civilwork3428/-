
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  ClipboardCheck, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  Download, 
  FileText, 
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Building2,
  BookOpen,
  UserCheck,
  HeartHandshake,
  Lightbulb,
  MessageSquarePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Rating = 1 | 2 | 3 | 4 | 5;

interface SurveyData {
  courseName: string;
  unit: string;
  managementId: string;
  dateType: 'today' | 'custom';
  customDate: string;
  courseEval: {
    help: Rating;
    clarity: Rating;
    timing: Rating;
    overall: Rating;
  };
  teachingEval: {
    clarity: Rating;
    attitude: Rating;
    interaction: Rating;
    satisfaction: Rating;
  };
  serviceEval: {
    kindness: Rating;
    comfort: Rating;
    satisfaction: Rating;
  };
  feedback: string[];
  otherFeedback: string;
  sharing: string;
  strengths: string;
  suggestions: string;
  futureLearning: string;
}

const INITIAL_DATA: SurveyData = {
  courseName: '',
  unit: '',
  managementId: '',
  dateType: 'today',
  customDate: new Date().toISOString().split('T')[0],
  courseEval: { help: 5, clarity: 5, timing: 5, overall: 5 },
  teachingEval: { clarity: 5, attitude: 5, interaction: 5, satisfaction: 5 },
  serviceEval: { kindness: 5, comfort: 5, satisfaction: 5 },
  feedback: [],
  otherFeedback: '',
  sharing: '',
  strengths: '',
  suggestions: '',
  futureLearning: '',
};

const RATING_LABELS: Record<Rating, string> = {
  5: '👍 5星',
  4: '😊 4星',
  3: '🙂 3星',
  2: '🤔 2星',
  1: '👎 1星',
};

// --- Components ---

const StarRating = ({ value, onChange, label }: { value: Rating, onChange: (v: Rating) => void, label: string }) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="flex gap-1">
        {([5, 4, 3, 2, 1] as Rating[]).map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={cn(
              "flex-1 py-2 px-1 rounded-lg border transition-all text-xs flex flex-col items-center gap-1",
              value === star 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/10" 
                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
            )}
          >
            <span className="text-base">{RATING_LABELS[star].split(' ')[0]}</span>
            <span className="font-bold">{star}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SurveyData>(INITIAL_DATA);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const totalSteps = 8;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const exportJPG = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      // Temporarily show the report for capture
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
        logging: false,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      const fileName = `${data.unit || '未命名'}_${data.managementId || '無'}.jpg`;
      link.download = fileName;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error('Export JPG failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const exportDOC = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "國土永續研究教育基金會課程滿意度調查",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "管理編號: ", bold: true }),
              new TextRun(data.managementId || '無'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "課程名稱: ", bold: true }),
              new TextRun(data.courseName),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "所屬單位: ", bold: true }),
              new TextRun(data.unit),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "上課日期: ", bold: true }),
              new TextRun(data.dateType === 'today' ? '今天' : data.customDate),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "【課程評價】", heading: HeadingLevel.HEADING_2 }),
          new Paragraph(`1. 課程幫助: ${data.courseEval.help}星`),
          new Paragraph(`2. 課程解說: ${data.courseEval.clarity}星`),
          new Paragraph(`3. 時間掌控: ${data.courseEval.timing}星`),
          new Paragraph(`4. 總體滿意: ${data.courseEval.overall}星`),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "【教學評價】", heading: HeadingLevel.HEADING_2 }),
          new Paragraph(`1. 解說清楚: ${data.teachingEval.clarity}星`),
          new Paragraph(`2. 上課態度: ${data.teachingEval.attitude}星`),
          new Paragraph(`3. 互動表現: ${data.teachingEval.interaction}星`),
          new Paragraph(`4. 教學滿意: ${data.teachingEval.satisfaction}星`),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "【服務評價】", heading: HeadingLevel.HEADING_2 }),
          new Paragraph(`1. 態度親切: ${data.serviceEval.kindness}星`),
          new Paragraph(`2. 場地舒適: ${data.serviceEval.comfort}星`),
          new Paragraph(`3. 服務滿意: ${data.serviceEval.satisfaction}星`),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "【學習回饋】", heading: HeadingLevel.HEADING_2 }),
          new Paragraph(`收穫: ${data.feedback.join(', ')} ${data.otherFeedback ? `(${data.otherFeedback})` : ''}`),
          new Paragraph(`分享意願: ${data.sharing}`),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "【寶貴建議】", heading: HeadingLevel.HEADING_2 }),
          new Paragraph(`優點: ${data.strengths || '無'}`),
          new Paragraph(`建議: ${data.suggestions || '無'}`),
          new Paragraph(`未來想學: ${data.futureLearning || '無'}`),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${data.unit || '未命名'}_${data.managementId || '無'}.docx`;
    saveAs(blob, fileName);
  };

  const renderStep = () => {
    switch(step) {
      case 0:
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                課程名稱
              </label>
              <div className="grid grid-cols-1 gap-3">
                {['計畫說明會+教育訓練', '知能強化+地圖繪製+實作演練'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setData({ ...data, courseName: opt })}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      data.courseName === opt 
                        ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/10 text-indigo-700 font-medium" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <ClipboardCheck className="w-4 h-4 text-indigo-500" />
                管理編號
              </label>
              <input
                type="text"
                placeholder="請填寫"
                className="input-field"
                value={data.managementId}
                onChange={e => setData({ ...data, managementId: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Building2 className="w-4 h-4 text-indigo-500" />
                所屬村里/社區/單位？
              </label>
              <input
                type="text"
                placeholder="請概述"
                className="input-field"
                value={data.unit}
                onChange={e => setData({ ...data, unit: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Calendar className="w-4 h-4 text-indigo-500" />
                上課日期
              </label>
              <div className="flex gap-3">
                {['today', 'custom'].map(type => (
                  <button
                    key={type}
                    onClick={() => setData({ ...data, dateType: type as any })}
                    className={cn(
                      "flex-1 p-3 rounded-xl border transition-all",
                      data.dateType === type 
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-medium" 
                        : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    {type === 'today' ? '今天' : '指定日期'}
                  </button>
                ))}
              </div>
              {data.dateType === 'custom' && (
                <input
                  type="text"
                  placeholder="請概述日期 (例如: 2024/03/12)"
                  className="input-field"
                  value={data.customDate}
                  onChange={e => setData({ ...data, customDate: e.target.value })}
                />
              )}
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <h3 className="text-indigo-900 font-bold flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                課程評價
              </h3>
              <p className="text-indigo-700/70 text-sm">對於課程安排，您覺得如何？</p>
            </div>
            <div className="space-y-6">
              <StarRating 
                label="1. 課程對您有沒有幫助?" 
                value={data.courseEval.help} 
                onChange={v => setData({ ...data, courseEval: { ...data.courseEval, help: v } })} 
              />
              <StarRating 
                label="2. 課程解說，聽不聽得懂？" 
                value={data.courseEval.clarity} 
                onChange={v => setData({ ...data, courseEval: { ...data.courseEval, clarity: v } })} 
              />
              <StarRating 
                label="3. 課程時間的掌控與安排？" 
                value={data.courseEval.timing} 
                onChange={v => setData({ ...data, courseEval: { ...data.courseEval, timing: v } })} 
              />
              <StarRating 
                label="4. 課程的總體滿意度?" 
                value={data.courseEval.overall} 
                onChange={v => setData({ ...data, courseEval: { ...data.courseEval, overall: v } })} 
              />
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <h3 className="text-emerald-900 font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                教學評價
              </h3>
              <p className="text-emerald-700/70 text-sm">對於講師的教法，您覺得如何？</p>
            </div>
            <div className="space-y-6">
              <StarRating 
                label="1. 解說清楚?" 
                value={data.teachingEval.clarity} 
                onChange={v => setData({ ...data, teachingEval: { ...data.teachingEval, clarity: v } })} 
              />
              <StarRating 
                label="2. 上課態度?" 
                value={data.teachingEval.attitude} 
                onChange={v => setData({ ...data, teachingEval: { ...data.teachingEval, attitude: v } })} 
              />
              <StarRating 
                label="3. 互動表現？" 
                value={data.teachingEval.interaction} 
                onChange={v => setData({ ...data, teachingEval: { ...data.teachingEval, interaction: v } })} 
              />
              <StarRating 
                label="4. 教學滿意嗎？" 
                value={data.teachingEval.satisfaction} 
                onChange={v => setData({ ...data, teachingEval: { ...data.teachingEval, satisfaction: v } })} 
              />
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <h3 className="text-amber-900 font-bold flex items-center gap-2">
                <HeartHandshake className="w-5 h-5" />
                服務評價
              </h3>
              <p className="text-amber-700/70 text-sm">對於工作人員的服務和上課的場地，您覺得如何？</p>
            </div>
            <div className="space-y-6">
              <StarRating 
                label="1. 態度親切？" 
                value={data.serviceEval.kindness} 
                onChange={v => setData({ ...data, serviceEval: { ...data.serviceEval, kindness: v } })} 
              />
              <StarRating 
                label="2. 場地舒適?" 
                value={data.serviceEval.comfort} 
                onChange={v => setData({ ...data, serviceEval: { ...data.serviceEval, comfort: v } })} 
              />
              <StarRating 
                label="3. 服務滿意嗎？" 
                value={data.serviceEval.satisfaction} 
                onChange={v => setData({ ...data, serviceEval: { ...data.serviceEval, satisfaction: v } })} 
              />
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <h3 className="text-purple-900 font-bold flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                學習回饋
              </h3>
              <p className="text-purple-700/70 text-sm">上完這堂課，您覺得自己最大的收穫是什麼？(可複選)</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'A', text: '保護自己和家人的新知識' },
                { id: 'B', text: '實際運作/操作的經驗' },
                { id: 'C', text: '了解社區的居住環境' },
                { id: 'D', text: '災害來，要找誰幫忙、打哪支電話' },
                { id: 'E', text: '認識鄰里夥伴' },
                { id: 'F', text: '其他' },
              ].map(opt => {
                const isSelected = data.feedback.includes(opt.text);
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      const next = isSelected 
                        ? data.feedback.filter(f => f !== opt.text)
                        : [...data.feedback, opt.text];
                      setData({ ...data, feedback: next });
                    }}
                    className={cn(
                      "p-4 rounded-xl border text-left flex items-center gap-3 transition-all",
                      isSelected 
                        ? "bg-purple-50 border-purple-500 text-purple-700 font-medium" 
                        : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center transition-all",
                      isSelected ? "bg-purple-500 border-purple-500 text-white" : "border-slate-300"
                    )}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <span className="text-sm">{opt.id}. {opt.text}</span>
                  </button>
                );
              })}
              {data.feedback.includes('其他') && (
                <input
                  type="text"
                  placeholder="請填寫"
                  className="input-field mt-2"
                  value={data.otherFeedback}
                  onChange={e => setData({ ...data, otherFeedback: e.target.value })}
                />
              )}
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700">今天學到的東西，用在生活上或跟親友分享？</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'A', text: '會，一定會!' },
                  { id: 'B', text: '可能會，試看看' },
                  { id: 'C', text: '不太會' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setData({ ...data, sharing: opt.text })}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      data.sharing === opt.text 
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-medium" 
                        : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    {opt.id}. {opt.text}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 6:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
              <h3 className="text-slate-900 font-bold flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5" />
                寶貴建議
              </h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">這堂課，優點是?</label>
                <textarea
                  className="input-field min-h-[100px]"
                  placeholder="請填寫 (可空白)"
                  value={data.strengths}
                  onChange={e => setData({ ...data, strengths: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">有什麼建議?</label>
                <textarea
                  className="input-field min-h-[100px]"
                  placeholder="請填寫 (可空白)"
                  value={data.suggestions}
                  onChange={e => setData({ ...data, suggestions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">未來，您還想學什麼?</label>
                <textarea
                  className="input-field min-h-[100px]"
                  placeholder="請填寫 (可空白)"
                  value={data.futureLearning}
                  onChange={e => setData({ ...data, futureLearning: e.target.value })}
                />
              </div>
            </div>
          </motion.div>
        );
      case 7:
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">感謝您的填寫！</h2>
              <p className="text-slate-500">您的意見是我們進步的最大動力。</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button onClick={exportJPG} disabled={isExporting} className="btn-primary w-full py-4 text-lg">
                <ImageIcon className="w-5 h-5" />
                {isExporting ? '生成中...' : '導出 JPG 報表'}
              </button>
              <button onClick={exportDOC} className="btn-secondary w-full py-4 text-lg">
                <FileText className="w-5 h-5" />
                導出 DOC 文件
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <button onClick={() => setStep(0)} className="text-slate-400 text-sm hover:text-indigo-600 transition-colors mx-auto block">
                重新填寫
              </button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-2xl mb-8 text-center">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
          國土永續研究教育基金會<br />
          <span className="text-indigo-600">課程滿意度調查</span>
        </h1>
      </header>

      {/* Progress Bar */}
      {step < 7 && (
        <div className="w-full max-w-2xl mb-8">
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            <span>Progress</span>
            <span>{Math.round((step / 6) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="w-full max-w-2xl glass-card p-6 md:p-10 mb-24">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation */}
        {step < 7 && (
          <div className="flex gap-3 mt-10">
            {step > 0 && (
              <button onClick={prevStep} className="btn-secondary flex-1">
                <ChevronLeft className="w-5 h-5" />
                上一步
              </button>
            )}
            <button 
              onClick={nextStep} 
              className={cn(
                "btn-primary flex-[2]",
                (step === 0 && (!data.courseName || !data.unit)) && "opacity-50 pointer-events-none"
              )}
            >
              {step === 6 ? '提交問卷' : '下一步'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>

      {/* Hidden Report for Capture */}
      <div className="fixed left-[-9999px] top-0">
        <div 
          ref={reportRef} 
          className="w-[1600px] h-[1200px] p-16 bg-slate-50 text-slate-900 font-sans flex flex-col"
        >
          <div className="flex justify-between items-end mb-12 border-b-8 border-indigo-600 pb-8">
            <div className="text-left">
              <h1 className="text-6xl font-black mb-4">課程滿意度調查報告</h1>
              <p className="text-2xl text-slate-500 font-bold uppercase tracking-[0.2em]">國土永續研究教育基金會</p>
            </div>
            <div className="text-right space-y-2">
              <div className="bg-indigo-600 text-white px-6 py-2 rounded-full text-xl font-black inline-block">
                管理編號：{data.managementId || '未填寫'}
              </div>
              <p className="text-slate-400 font-bold">生成時間：{new Date().toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-12 flex-1">
            {/* Column 1: Basic Info & Course Eval */}
            <div className="space-y-8">
              <section className="bg-white p-8 rounded-[2rem] border-2 border-slate-200 shadow-sm">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800">
                  <div className="w-2 h-8 bg-slate-800 rounded-full" />
                  基本資料
                </h2>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-wider mb-1">課程名稱</p>
                    <p className="text-2xl font-bold text-indigo-700">{data.courseName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-wider mb-1">所屬單位</p>
                    <p className="text-2xl font-bold text-slate-800">{data.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-wider mb-1">上課日期</p>
                    <p className="text-2xl font-bold text-slate-800">{data.dateType === 'today' ? new Date().toLocaleDateString() : data.customDate}</p>
                  </div>
                </div>
              </section>

              <section className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-sm">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-indigo-600">
                  <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                  課程評價
                </h2>
                <div className="space-y-4">
                  {[
                    { label: '課程幫助', val: data.courseEval.help },
                    { label: '課程解說', val: data.courseEval.clarity },
                    { label: '時間掌控', val: data.courseEval.timing },
                    { label: '總體滿意', val: data.courseEval.overall },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-xl text-slate-500">{item.label}</span>
                      <span className="text-2xl font-black text-indigo-600">{item.val} 星</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Column 2: Teaching & Service Eval */}
            <div className="space-y-8">
              <section className="bg-white p-8 rounded-[2rem] border-2 border-emerald-100 shadow-sm">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-emerald-600">
                  <div className="w-2 h-8 bg-emerald-600 rounded-full" />
                  教學評價
                </h2>
                <div className="space-y-4">
                  {[
                    { label: '解說清楚', val: data.teachingEval.clarity },
                    { label: '上課態度', val: data.teachingEval.attitude },
                    { label: '互動表現', val: data.teachingEval.interaction },
                    { label: '教學滿意', val: data.teachingEval.satisfaction },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-xl text-slate-500">{item.label}</span>
                      <span className="text-2xl font-black text-emerald-600">{item.val} 星</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-8 rounded-[2rem] border-2 border-amber-100 shadow-sm">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-amber-600">
                  <div className="w-2 h-8 bg-amber-600 rounded-full" />
                  服務評價
                </h2>
                <div className="space-y-4">
                  {[
                    { label: '態度親切', val: data.serviceEval.kindness },
                    { label: '場地舒適', val: data.serviceEval.comfort },
                    { label: '服務滿意', val: data.serviceEval.satisfaction },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-xl text-slate-500">{item.label}</span>
                      <span className="text-2xl font-black text-amber-600">{item.val} 星</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Column 3: Feedback & Suggestions */}
            <div className="space-y-8">
              <section className="bg-white p-8 rounded-[2rem] border-2 border-purple-100 shadow-sm">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-purple-600">
                  <div className="w-2 h-8 bg-purple-600 rounded-full" />
                  學習回饋
                </h2>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-bold text-slate-400 mb-2 uppercase">最大收穫</p>
                    <p className="text-xl text-slate-700 leading-relaxed">{data.feedback.join(', ')} {data.otherFeedback && `(${data.otherFeedback})`}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-400 mb-2 uppercase">分享意願</p>
                    <p className="text-xl font-bold text-indigo-600">{data.sharing}</p>
                  </div>
                </div>
              </section>

              <section className="bg-white p-8 rounded-[2rem] border-2 border-slate-200 shadow-sm flex-1">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-600">
                  <div className="w-2 h-8 bg-slate-600 rounded-full" />
                  寶貴建議
                </h2>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-bold text-slate-400 mb-1 uppercase">優點</p>
                    <p className="text-lg text-slate-700">{data.strengths || '無'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-400 mb-1 uppercase">建議</p>
                    <p className="text-lg text-slate-700">{data.suggestions || '無'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-400 mb-1 uppercase">未來想學</p>
                    <p className="text-lg text-slate-700">{data.futureLearning || '無'}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-12 text-center text-slate-400 text-lg italic font-medium">
            本報告由課程滿意度調查系統自動生成 · 國土永續研究教育基金會
          </div>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
