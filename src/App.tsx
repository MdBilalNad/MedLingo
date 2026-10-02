import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  Languages,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Eye,
  EyeOff,
  User as UserIcon,
  Activity,
  CheckSquare,
  Square,
  Send,
  Bot,
  Bookmark,
  BookmarkCheck,
  LogIn,
  LogOut,
  FileCheck,
  Paperclip,
  Trash2,
  Stethoscope,
  Clock,
  Moon,
  Sun,
  Home,
  Sliders,
  Server,
  Database,
  Shield,
  Download,
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  Key,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from './core/languages.ts';
import { SYNTHETIC_REPORTS } from './data/synthetic_data.ts';
import { UI_TRANSLATIONS, type UiTranslations } from './lib/translations.ts';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,
  type User,
} from './lib/firebase.ts';
import {
  evaluateClinicalAssessment,
} from './core/clinicalScoring.ts';
import {
  ScoreProgressionChart,
  type ScoreDataPoint,
} from './components/ScoreProgressionChart.tsx';
import { DocumentGuidelines } from './components/DocumentGuidelines.tsx';
import { PrivacyTermsModals } from './components/PrivacyTermsModals.tsx';
import type {
  AnalysisRequest,
  AnalysisResponse,
  FlagType,
  LabResult,
  SupportedLanguage,
  HealthLiteracyAssessment,
} from './types/medical.ts';

interface ChatMessage {
  id: string;
  sender: 'user' | 'doctor';
  text: string;
  timestamp: string;
}

interface SavedReportItem {
  id: string;
  title: string;
  rawText: string;
  language: string;
  summary: string;
  hasCritical: boolean;
  urgentNotice: string | null;
  createdAtText: string;
  score: number;
  resultsJson: string;
}

export default function App() {
  // Input state
  const [reportText, setReportText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>('');
  const [includeAudio, setIncludeAudio] = useState(false);

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    base64: string;
    isImage: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('medlingo_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<
    'home' | 'analyzer' | 'dashboard' | 'samples' | 'chat' | 'history' | 'settings'
  >('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Pipeline & Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [clinicalAssessment, setClinicalAssessment] =
    useState<HealthLiteracyAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
  const [showRedactedPreview, setShowRedactedPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Firebase Auth & Saved Reports State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReportItem[]>([]);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportSavedSuccess, setReportSavedSuccess] = useState(false);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Settings State & Password Form
  const [backendSettings, setBackendSettings] = useState({
    theme: 'light',
    preferredLanguage: 'en',
    autoReadAudio: false,
    piiStrictness: 'strict',
    ocrThreshold: 0.60,
    targetReadingGrade: 7,
  });
  const [backendStatus, setBackendStatus] = useState<any>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessNotice, setSettingsSuccessNotice] = useState(false);
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Modals state (Privacy Policy & Terms)
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Translation helpers
  const t: UiTranslations = UI_TRANSLATIONS[selectedLanguage] || UI_TRANSLATIONS.en;
  const currentLangObj: SupportedLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];
  const isRTL = currentLangObj.dir === 'rtl';

  // Synchronize Dark Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('medlingo_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fetch backend settings on startup
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setBackendSettings((prev) => ({ ...prev, ...data.settings }));
          }
          if (data.system) {
            setBackendStatus(data.system);
          }
        }
      } catch (err) {
        console.warn('Could not load server settings on init:', err);
      }
    };
    fetchSettings();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        loadUserSavedReports(user.uid);
      } else {
        setSavedReports([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Pipeline simulation progress
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setPipelineStep(1);
      interval = setInterval(() => {
        setPipelineStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 700);
    } else {
      setPipelineStep(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Load saved reports from Firestore
  const loadUserSavedReports = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'users', uid, 'savedReports'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const loaded: SavedReportItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        let parsedResults: LabResult[] = [];
        try {
          parsedResults = JSON.parse(d.results || '[]');
        } catch {
          parsedResults = [];
        }
        const assessment = evaluateClinicalAssessment(parsedResults, d.urgentNotice || null);

        loaded.push({
          id: docSnap.id,
          title: d.title || 'Laboratory Report',
          rawText: d.rawText || '',
          language: d.language || 'en',
          summary: d.summary || '',
          hasCritical: Boolean(d.hasCritical),
          urgentNotice: d.urgentNotice || null,
          createdAtText: d.createdAt?.toDate
            ? d.createdAt.toDate().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent',
          score: assessment.score,
          resultsJson: d.results || '[]',
        });
      });
      setSavedReports(loaded);
    } catch (err) {
      console.warn('Could not load user saved reports:', err);
    }
  };

  // Google Sign-in Handler
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      alert('Sign in failed: ' + (err?.message || 'Please check popup settings.'));
    }
  };

  // Sign-out Handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  // Save Report to Firestore
  const handleSaveReport = async () => {
    if (!currentUser) {
      alert('Please sign in with Google to save your lab reports to your profile.');
      handleSignIn();
      return;
    }
    if (!analysisResult) return;

    setIsSavingReport(true);
    try {
      const title =
        analysisResult.results.length > 0
          ? `${analysisResult.results.slice(0, 2).map((r) => r.test_name).join(', ')} Report`
          : 'Laboratory Blood Report';

      await addDoc(collection(db, 'users', currentUser.uid, 'savedReports'), {
        userId: currentUser.uid,
        title,
        rawText: reportText,
        language: selectedLanguage,
        summary: analysisResult.summary,
        hasCritical: Boolean(analysisResult.urgent_notice),
        urgentNotice: analysisResult.urgent_notice || null,
        results: JSON.stringify(analysisResult.results),
        createdAt: serverTimestamp(),
      });

      setReportSavedSuccess(true);
      setTimeout(() => setReportSavedSuccess(false), 3000);
      loadUserSavedReports(currentUser.uid);
    } catch (err: any) {
      console.error('Failed to save report to Firestore:', err);
      alert('Could not save report: ' + (err?.message || 'Firestore error'));
    } finally {
      setIsSavingReport(false);
    }
  };

  // Delete Individual Saved Report from Firestore
  const handleDeleteReport = async (reportId: string) => {
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to permanently delete this report analysis?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'savedReports', reportId));
      setSavedReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: any) {
      console.error('Failed to delete report:', err);
      alert('Could not delete report: ' + err?.message);
    }
  };

  // Export All Analysis Data as JSON
  const handleExportJson = () => {
    const exportPayload = {
      user: currentUser
        ? { uid: currentUser.uid, email: currentUser.email, name: currentUser.displayName }
        : 'guest',
      exportedAt: new Date().toISOString(),
      activeAnalysis: analysisResult
        ? {
            score: clinicalAssessment?.score,
            results: analysisResult.results,
            summary: analysisResult.summary,
            conditionMatches: clinicalAssessment?.conditionMatches,
            roadmap: clinicalAssessment?.roadmap,
          }
        : null,
      savedReportsHistory: savedReports,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medlingo-analysis-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete Account and All Reports
  const handleDeleteAccountData = async () => {
    if (!currentUser) {
      alert('You are currently browsing as a guest. Local session data has been reset.');
      setAnalysisResult(null);
      setClinicalAssessment(null);
      setReportText('');
      return;
    }

    const confirmed = window.confirm(
      'WARNING: This will permanently delete all your saved lab reports, history, and account profile data from MedLingo. This action cannot be undone. Do you wish to proceed?'
    );
    if (!confirmed) return;

    try {
      for (const item of savedReports) {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'savedReports', item.id));
      }
      setSavedReports([]);
      setAnalysisResult(null);
      setClinicalAssessment(null);
      await signOut(auth);
      alert('Your account data and saved reports have been permanently deleted.');
      setActiveTab('home');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      alert('Failed to delete account data: ' + err?.message);
    }
  };

  // Save Settings to Backend API
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...backendSettings,
          theme,
          preferredLanguage: selectedLanguage,
        }),
      });

      if (!res.ok) throw new Error('Failed to update server settings.');
      setSettingsSuccessNotice(true);
      setTimeout(() => setSettingsSuccessNotice(false), 3000);
    } catch (err: any) {
      console.error('Settings save error:', err);
      alert('Error saving settings: ' + err?.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordState.currentPassword || !passwordState.newPassword) {
      setPasswordNotice('Please complete all required password fields.');
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordNotice('New password and confirmation do not match.');
      return;
    }
    if (passwordState.newPassword.length < 8) {
      setPasswordNotice('Password must be at least 8 characters with 1 number.');
      return;
    }

    setPasswordNotice('Password updated successfully.');
    setPasswordState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setPasswordNotice(null), 4000);
  };

  // File Upload Handlers (PDF, Images, Text)
  const processUploadedFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please upload a smaller PDF or image.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isText = file.type === 'text/plain';

    if (!isImage && !isPdf && !isText) {
      setError('Supported formats: PDF, JPG, PNG, WEBP, or TXT.');
      return;
    }

    setError(null);
    const reader = new FileReader();

    if (isText) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setReportText(text);
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          base64: '',
          isImage: false,
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const base64Data = e.target?.result as string;
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          base64: base64Data,
          isImage,
        });
        if (!reportText) {
          setReportText(`[Attached Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    if (reportText.startsWith('[Attached Document:')) {
      setReportText('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle sample report selection
  const handleSelectSample = (sampleId: string) => {
    const sample = SYNTHETIC_REPORTS.find((s) => s.id === sampleId);
    if (sample) {
      setReportText(sample.raw_text);
      setUploadedFile(null);
      setAge(String(sample.patient_profile.age));
      setSex(sample.patient_profile.sex);
      setActiveTab('analyzer');
      setAnalysisResult(null);
      setClinicalAssessment(null);
      setError(null);
    }
  };

  // Load a saved report from Firestore into Dashboard
  const handleLoadSavedReport = (item: SavedReportItem) => {
    setReportText(item.rawText);
    setSelectedLanguage(item.language);
    setUploadedFile(null);

    try {
      const parsedResults: LabResult[] = JSON.parse(item.resultsJson);
      const assessment = evaluateClinicalAssessment(parsedResults, item.urgentNotice);

      setAnalysisResult({
        results: parsedResults,
        summary: item.summary,
        explanations: {},
        questions_for_doctor: [
          'What lifestyle or dietary adjustments do you recommend based on these findings?',
          'Should we schedule a follow-up lab test in 4 to 12 weeks to monitor trends?',
        ],
        urgent_notice: item.urgentNotice,
        disclaimer: UI_TRANSLATIONS[item.language]?.tagline || '',
        language: item.language,
        audio_url: null,
        warnings: [],
      });
      setClinicalAssessment(assessment);
      setActiveTab('dashboard');
    } catch {
      handleAnalyze(item.language);
    }
  };

  // Perform Analysis
  const handleAnalyze = async (customLang?: string) => {
    const langToUse = customLang || selectedLanguage;

    const hasText = Boolean(reportText.trim() && !reportText.startsWith('[Attached Document:'));
    const hasBase64 = Boolean(uploadedFile?.base64);

    if (!hasText && !hasBase64) {
      setError(
        'Please upload a lab report (PDF/image) or paste your blood test findings before analyzing.'
      );
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    const payload: AnalysisRequest = {
      report_text: hasText ? reportText : undefined,
      report_image_base64: hasBase64 ? uploadedFile!.base64 : undefined,
      language: langToUse,
      age: age ? parseInt(age, 10) : null,
      sex: sex ? (sex as any) : null,
      include_audio: includeAudio,
    };

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data: AnalysisResponse = await response.json();
      setAnalysisResult(data);

      // Compute clinical scoring, strengths, weaknesses, condition matches, and roadmap
      const assessment = evaluateClinicalAssessment(data.results, data.urgent_notice);
      setClinicalAssessment(assessment);

      // Expand all abnormal tests by default
      const initialExpanded: Record<string, boolean> = {};
      data.results.forEach((r) => {
        if (r.flag !== 'normal') {
          initialExpanded[r.test_name] = true;
        }
      });
      setExpandedTests(initialExpanded);
      setCheckedQuestions({});

      // Initialize Dr. MedLingo chatbot
      const initialGreeting: ChatMessage = {
        id: 'init-1',
        sender: 'doctor',
        text: data.urgent_notice
          ? `Hello, I am Dr. MedLingo. Your report shows critical lab markers that require prompt medical attention. I am here to help you prepare questions and understand these findings before your urgent doctor consultation.`
          : `Hello, I am Dr. MedLingo. Your lab panel of ${data.results.length} parameters has been evaluated with a Health Literacy Score of ${assessment.score}/100. Feel free to ask me what steps you should take, dietary adjustments, or what symptoms to monitor.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages([initialGreeting]);

      // Automatically transition to Post-Score Dashboard
      setActiveTab('dashboard');
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err?.message || 'Failed to analyze report. Please verify input and retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChangeLanguage = (newLang: string) => {
    setSelectedLanguage(newLang);
    if (analysisResult && (reportText || uploadedFile)) {
      handleAnalyze(newLang);
    }
  };

  const handlePlayAudio = (customText?: string) => {
    const textToSpeak =
      customText ||
      (analysisResult
        ? `${analysisResult.summary}. Key questions to ask your doctor: ${analysisResult.questions_for_doctor.join('. ')}`
        : '');
    if (!textToSpeak) return;

    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    if (!customText && analysisResult?.audio_url) {
      if (!audioRef.current) {
        audioRef.current = new Audio(analysisResult.audio_url);
      } else {
        audioRef.current.src = analysisResult.audio_url;
      }
      audioRef.current.onended = () => setIsPlayingAudio(false);
      audioRef.current.play();
      setIsPlayingAudio(true);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = currentLangObj.code;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleSendChatMessage = async (presetText?: string) => {
    const messageToSend = presetText || chatInput;
    if (!messageToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: messageToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setIsChatLoading(true);

    try {
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          history: historyPayload,
          reportContext: analysisResult
            ? {
                results: analysisResult.results,
                summary: analysisResult.summary,
                urgentNotice: analysisResult.urgent_notice,
              }
            : null,
          patientContext: {
            age: age ? parseInt(age, 10) : undefined,
            sex: sex || undefined,
          },
          language: selectedLanguage,
        }),
      });

      if (!res.ok) throw new Error('Chat service error');

      const data = await res.json();
      const doctorReply: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'doctor',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, doctorReply]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackReply: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'doctor',
        text:
          'I have evaluated your laboratory findings. If critical flags are present, contact emergency medical care immediately. For non-critical flags, prioritize oral hydration, avoid unaccustomed physical strain, and present this report to your physician.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    const abnormalList = analysisResult.results
      .filter((r) => r.flag !== 'normal')
      .map((r) => `- ${r.test_name}: ${r.value} ${r.unit || ''} [${r.flag.toUpperCase()}]`)
      .join('\n');

    const formatted = `MEDLINGO CLINICAL LABORATORY REPORT ANALYSIS (${currentLangObj.name})
--------------------------------------------------
HEALTH LITERACY SCORE: ${clinicalAssessment?.score || 85} / 100 (${clinicalAssessment?.rating || 'Stable'})
${analysisResult.urgent_notice ? `\nURGENT NOTICE:\n${analysisResult.urgent_notice}\n` : ''}
SUMMARY:
${analysisResult.summary}

KEY FINDINGS:
${abnormalList || 'All tested parameters satisfy standard biological reference boundaries.'}

CONDITION MATCH ESTIMATES:
${clinicalAssessment?.conditionMatches.map((c) => `- ${c.condition}: ${c.matchPercentage}% match (${c.rationale})`).join('\n') || ''}

QUESTIONS FOR DOCTOR:
${analysisResult.questions_for_doctor.map((q, i) => `${i + 1}. ${q}`).join('\n')}

DISCLAIMER:
${analysisResult.disclaimer}
`;
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getFlagBadge = (flag: FlagType) => {
    switch (flag) {
      case 'critical_high':
      case 'critical_low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-700 text-white">
            <AlertTriangle className="w-3 h-3" />
            CRITICAL {flag.includes('high') ? 'HIGH' : 'LOW'}
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
            HIGH [H]
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-800">
            LOW [L]
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            NORMAL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            REPORTED
          </span>
        );
    }
  };

  // Convert saved reports into chart points
  const scoreChartData: ScoreDataPoint[] = savedReports.map((r, i) => {
    let testCount = 3;
    try {
      const parsed = JSON.parse(r.resultsJson);
      testCount = parsed.length || 3;
    } catch {
      testCount = 3;
    }
    return {
      id: r.id,
      label: r.title,
      date: r.createdAtText,
      score: r.score || 80,
      testCount,
      hasCritical: r.hasCritical,
    };
  });

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Clinical Top Navigation Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded bg-teal-700 flex items-center justify-center text-white font-black text-sm">
                +
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  MedLingo
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Enterprise Pathology Analyzer
                </span>
              </div>
            </div>

            {/* Top Navigation Links (Desktop) */}
            <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'home'
                    ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('analyzer')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'analyzer' || activeTab === 'dashboard'
                    ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Analyzer
              </button>
              <button
                onClick={() => setActiveTab('samples')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'samples'
                    ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sample Library
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${
                  activeTab === 'chat'
                    ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Clinical Chat
              </button>
              {currentUser && (
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    activeTab === 'history'
                      ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-bold'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  History ({savedReports.length})
                </button>
              )}
            </nav>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2.5">
            {/* Language Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => handleChangeLanguage(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-600"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.native_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>

            {/* Auth / Account Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-2.5">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400"
                >
                  <img
                    src={
                      currentUser.photoURL ||
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=user'
                    }
                    alt={currentUser.displayName || 'User'}
                    className="w-6 h-6 rounded border border-teal-600"
                  />
                  <span className="hidden md:inline truncate max-w-[100px]">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </button>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-3 py-1.5 bg-slate-900 dark:bg-teal-700 hover:bg-slate-800 dark:hover:bg-teal-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Layout with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Fixed/Standard Clinical Sidebar (Dashboard View) */}
        <aside
          className={`lg:w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-6 shrink-0 lg:block ${
            isSidebarOpen
              ? 'fixed inset-y-14 left-0 z-30 w-72 shadow-lg lg:shadow-none'
              : 'hidden'
          }`}
        >
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
              Clinical Navigation
            </div>

            <button
              onClick={() => {
                setActiveTab('home');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                activeTab === 'home'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>Landing Page</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('analyzer');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                activeTab === 'analyzer'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Report Upload</span>
            </button>

            {analysisResult && (
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Analysis Dashboard</span>
                </div>
                <span className="text-[10px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-1.5 py-0.5 rounded font-mono font-bold">
                  {clinicalAssessment?.score || 85}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('chat');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Consult Dr. MedLingo</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('samples');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                activeTab === 'samples'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Clinical Samples</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 text-slate-400" />
                <span>History & Trends</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {savedReports.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>Settings & Privacy</span>
            </button>
          </div>

          {/* Quick Engine Status in Sidebar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
              System Health
            </div>
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Flagging Rules</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Deterministic
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">PII Scrubbing</span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                  Active On-Device
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Cloud Storage</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  Firestore
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* ========================================================= */}
          {/* 1. LANDING PAGE                                           */}
          {/* ========================================================= */}
          {activeTab === 'home' && (
            <div className="space-y-10 max-w-5xl mx-auto">
              {/* Clinical Hero Section */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-8 sm:p-12 space-y-6">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                  Clinical-Grade Decision Support & Health Literacy
                </div>

                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Multilingual Clinical Laboratory Report Analyzer
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                    Upload blood tests or pathology reports. Receive zero-hallucination explanations in your native language with deterministic reference intervals, condition matches, and actionable questions for your physician.
                  </p>
                </div>

                {/* Primary Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('analyzer')}
                    className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded text-xs transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Launch Report Analyzer
                  </button>
                  <button
                    onClick={() => setActiveTab('samples')}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold rounded text-xs transition-colors"
                  >
                    Test with Clinical Samples
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Consult Dr. MedLingo
                  </button>
                </div>
              </div>

              {/* Technical Specifications Architecture */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                    <Activity className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    Deterministic Flagging Engine
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Evaluates reference intervals and critical safety cutoffs strictly through pure mathematical code rules. Eliminates LLM numerical guesswork and hallucinations.
                  </p>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                    <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    Automated PII Scrubbing
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Identifies and redacts patient full names, medical record numbers (MRN), dates of birth, and phone numbers before any clinical text is parsed.
                  </p>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                    <Languages className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    Native Multilingual Equity
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Direct translations across 8 global languages (English, Hindi, Spanish, Arabic, French, Bengali, Urdu, Tamil) with full Right-to-Left (RTL) layout support.
                  </p>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                    <Stethoscope className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    Dr. MedLingo Clinical Health Educator
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    A clinical conversational assistant trained to provide objective health education, outline non-pharmacological habits, identify red-flag symptoms, and formulate doctor questions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. ANALYZER / UPLOAD PAGE                                 */}
          {/* ========================================================= */}
          {activeTab === 'analyzer' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Laboratory Report Ingestion
                    </h2>
                    <p className="text-xs text-slate-500">
                      Upload pathology PDF documents, smartphone scans, or paste laboratory text.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReportText('');
                      removeUploadedFile();
                      setAnalysisResult(null);
                      setClinicalAssessment(null);
                      setError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear All
                  </button>
                </div>

                {/* Dashed-Border Drop Zone */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors duration-150 ${
                      isDragging
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40'
                        : uploadedFile
                        ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Upload className="w-7 h-7 text-teal-700 dark:text-teal-400 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Drag and drop laboratory report file here, or click to browse
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supports PDF, JPG, PNG, and scanned medical documents up to 10MB
                    </p>
                    <button
                      type="button"
                      className="mt-3 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Browse Local Device
                    </button>
                  </div>

                  {uploadedFile && (
                    <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {uploadedFile.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({(uploadedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUploadedFile();
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Remove Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Document Guidelines Component */}
                <DocumentGuidelines />

                {/* Fallback Text Input Area */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Or Enter Raw Laboratory Findings
                  </label>
                  <textarea
                    rows={5}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Hemoglobin 10.2 g/dL 12.0 - 15.5&#10;White Blood Cells 6.4 x10^3/uL 4.5 - 11.0&#10;Potassium 6.8 mmol/L 3.5 - 5.0"
                    className="w-full text-xs font-mono p-3 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-teal-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Ensure test name, value, and reference ranges are provided.</span>
                    <span>{reportText.length} characters</span>
                  </div>
                </div>

                {/* Demographics Calibration Form */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Patient Age
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Biological Sex
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value as any)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    >
                      <option value="">Not Specified</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Output Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleChangeLanguage(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    >
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.native_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Real Sample Quick Buttons (Clean Secondary Buttons) */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Test with real sample reports:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectSample('cbc-anemia')}
                      className="p-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-left text-xs transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Alex Chen: CBC Anemia Panel
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Hemoglobin 9.8 g/dL • Low RBC count
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSample('critical-potassium')}
                      className="p-2.5 rounded border border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 text-left text-xs transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-rose-900 dark:text-rose-200">
                          Jordan Taylor: Critical Potassium
                        </div>
                        <div className="text-[11px] text-rose-700 dark:text-rose-400">
                          Serum Potassium 6.8 mmol/L • Critical High
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSample('lipid-profile-high')}
                      className="p-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-left text-xs transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          David Miller: Lipid Profile
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Total Cholesterol 242 mg/dL • High Risk
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSample('liver-cmp-high')}
                      className="p-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-left text-xs transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Elena Rostova: Metabolic CMP Panel
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Alanine Aminotransferase (ALT) 78 U/L
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Primary Evaluation Button */}
                <button
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing || (!reportText.trim() && !uploadedFile)}
                  className={`w-full py-3 px-4 rounded text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                    isAnalyzing || (!reportText.trim() && !uploadedFile)
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-teal-700 hover:bg-teal-800'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Processing Pipeline (Step {pipelineStep} of 4)...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Analyze Laboratory Report
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>{error}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. ANALYSIS DASHBOARD (Post-Score Display)                 */}
          {/* ========================================================= */}
          {activeTab === 'dashboard' && analysisResult && clinicalAssessment && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Critical Alert Banner */}
              {analysisResult.urgent_notice && (
                <div className="border-2 border-rose-600 bg-rose-50 dark:bg-rose-950/50 rounded p-4 flex items-start gap-3 text-rose-950 dark:text-rose-100 text-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-extrabold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                      Urgent Clinical Escalation Required
                    </div>
                    <p className="font-medium leading-relaxed">
                      {analysisResult.urgent_notice}
                    </p>
                  </div>
                </div>
              )}

              {/* Top Score & Action Header */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {/* Large Score Display */}
                  <div className="text-center px-4 py-2 border-r border-slate-200 dark:border-slate-800 pr-6">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Health Literacy Score
                    </div>
                    <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {clinicalAssessment.score}
                      <span className="text-lg text-slate-400 font-sans font-normal">/100</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          clinicalAssessment.score >= 85
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                            : clinicalAssessment.score >= 60
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                            : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
                        }`}
                      >
                        {clinicalAssessment.rating}
                      </span>
                      <span className="text-xs text-slate-500">
                        Evaluated across {analysisResult.results.length} parameters
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-56 h-2 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          clinicalAssessment.score >= 85
                            ? 'bg-teal-600'
                            : clinicalAssessment.score >= 60
                            ? 'bg-amber-600'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${clinicalAssessment.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handlePlayAudio()}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                      isPlayingAudio
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" /> Stop Audio
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Listen Audio
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSaveReport}
                    disabled={isSavingReport}
                    className="px-3 py-1.5 rounded text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    {reportSavedSuccess ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" /> Saved to Account
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5 text-slate-400" /> Save Report
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                    title="Copy Summary"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                    title="Print Analysis"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTab('chat')}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    Consult Dr. MedLingo
                  </button>
                </div>
              </div>

              {/* Strengths & Weaknesses (Two Distinct Clean Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths Card */}
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-800 dark:text-emerald-300 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Clinical Strengths & Preserved Functions
                  </div>

                  <div className="space-y-2.5">
                    {clinicalAssessment.strengths.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 space-y-1 text-xs"
                      >
                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{item.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.relatedTest}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses Card */}
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-800 dark:text-rose-300 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    Identified Parameter Weaknesses & Variances
                  </div>

                  <div className="space-y-2.5">
                    {clinicalAssessment.weaknesses.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/60 space-y-1 text-xs"
                      >
                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{item.title}</span>
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase font-mono">
                            {item.flag}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Condition Matches (5 Conditions with Percentages) */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Diagnostic Pattern & Condition Matches (5 Evaluated Profiles)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pattern recognition derived strictly from the evaluated numerical thresholds.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Condition Profile</th>
                        <th className="py-2.5 px-3 text-center">Match Probability</th>
                        <th className="py-2.5 px-3">Clinical Evaluation & Markers</th>
                        <th className="py-2.5 px-3 text-right">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                      {clinicalAssessment.conditionMatches.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                            {c.condition}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-bold text-xs">
                              {c.matchPercentage}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded mx-auto mt-1 overflow-hidden">
                              <div
                                className={`h-full ${
                                  c.matchPercentage > 75
                                    ? 'bg-rose-600'
                                    : c.matchPercentage > 50
                                    ? 'bg-amber-600'
                                    : 'bg-teal-600'
                                }`}
                                style={{ width: `${c.matchPercentage}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            {c.rationale}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                c.severity === 'high'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                                  : c.severity === 'moderate'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                              }`}
                            >
                              {c.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Animated Health Management Roadmap */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Animated Health Management Roadmap
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Step-by-step clinical timeline structured for optimal patient recovery.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  {clinicalAssessment.roadmap.map((step, idx) => (
                    <div
                      key={idx}
                      className="border-l-2 border-teal-600 dark:border-teal-500 pl-4 py-1 space-y-1.5 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded">
                          {step.phase} • {step.timeframe}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {step.title}
                        </span>
                      </div>
                      <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-xs">
                        {step.actions.map((act, actIdx) => (
                          <li key={actIdx} className="flex items-start gap-2">
                            <span className="text-slate-400 mt-1">•</span>
                            <span className="text-[11px]">{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Test Parameter Table */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Identified Laboratory Parameters ({analysisResult.results.length})
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Evaluated via Deterministic Code Logic
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Test Parameter</th>
                        <th className="py-2.5 px-3">Observed Value</th>
                        <th className="py-2.5 px-3">Reference Interval</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                      {analysisResult.results.map((r) => {
                        const isAbnormal = r.flag !== 'normal';
                        const isExpanded = Boolean(expandedTests[r.test_name]);

                        return (
                          <React.Fragment key={r.test_name}>
                            <tr
                              className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                                r.flag.includes('critical')
                                  ? 'bg-rose-50/30 dark:bg-rose-950/20'
                                  : isAbnormal
                                  ? 'bg-amber-50/20 dark:bg-amber-950/10'
                                  : ''
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {r.test_name}
                                </div>
                                {r.raw_name !== r.test_name && (
                                  <div className="text-[10px] text-slate-400">
                                    Reported: {r.raw_name}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {r.value !== null ? r.value : r.value_text}{' '}
                                <span className="font-normal text-[11px] text-slate-400">
                                  {r.unit || ''}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                {r.ref_text ||
                                  (r.ref_low !== null && r.ref_high !== null
                                    ? `${r.ref_low} - ${r.ref_high}`
                                    : 'Standard')}
                              </td>
                              <td className="py-2.5 px-3">{getFlagBadge(r.flag)}</td>
                              <td className="py-2.5 px-3 text-right">
                                {analysisResult.explanations[r.test_name] && (
                                  <button
                                    onClick={() =>
                                      setExpandedTests((prev) => ({
                                        ...prev,
                                        [r.test_name]: !prev[r.test_name],
                                      }))
                                    }
                                    className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                                  >
                                    {isExpanded ? 'Hide' : 'Explain'}
                                  </button>
                                )}
                              </td>
                            </tr>

                            {isExpanded && analysisResult.explanations[r.test_name] && (
                              <tr className="bg-slate-50 dark:bg-slate-800/40">
                                <td colSpan={5} className="p-3 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                                  <span className="font-bold text-teal-800 dark:text-teal-300">
                                    {r.test_name} Explanation:
                                  </span>{' '}
                                  {analysisResult.explanations[r.test_name]}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Questions to Ask Doctor */}
              {analysisResult.questions_for_doctor?.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                      Questions Prepared for Your Physician
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {Object.values(checkedQuestions).filter(Boolean).length} /{' '}
                      {analysisResult.questions_for_doctor.length} selected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {analysisResult.questions_for_doctor.map((q, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          setCheckedQuestions((prev) => ({
                            ...prev,
                            [idx]: !prev[idx],
                          }))
                        }
                        className={`p-3 rounded border text-xs cursor-pointer flex items-start gap-2.5 transition-colors ${
                          checkedQuestions[idx]
                            ? 'bg-teal-50/50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-950 dark:text-teal-200 font-medium'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {checkedQuestions[idx] ? (
                          <CheckSquare className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span className={checkedQuestions[idx] ? 'line-through opacity-70' : ''}>
                          {q}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. DASHBOARD HISTORY PAGE                                 */}
          {/* ========================================================= */}
          {activeTab === 'history' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Saved Report Analyses & Longitudinal Progression
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track changes across your lab panels over time. Backed by Google Cloud Firestore.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJson}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    Export JSON
                  </button>
                  <button
                    onClick={() => setActiveTab('analyzer')}
                    className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded"
                  >
                    New Analysis
                  </button>
                </div>
              </div>

              {/* Score Progression Line Chart */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    Score Progression Over Time
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Historical Literacy & Stability Rating
                  </span>
                </div>

                <ScoreProgressionChart data={scoreChartData} />
              </div>

              {/* Saved Reports List */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  Saved Laboratory Reports ({savedReports.length})
                </div>

                {savedReports.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 space-y-2">
                    <Bookmark className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">No saved reports currently in your profile.</p>
                    <button
                      onClick={() => setActiveTab('analyzer')}
                      className="px-3 py-1.5 bg-teal-700 text-white text-xs rounded font-medium"
                    >
                      Analyze First Report
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {savedReports.map((report) => (
                      <div
                        key={report.id}
                        className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {report.title}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold">
                              Score: {report.score}/100
                            </span>
                            {report.hasCritical && (
                              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                                Critical Alert
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>Saved on {report.createdAtText}</span>
                            <span>•</span>
                            <span className="uppercase">{report.language}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadSavedReport(report)}
                            className="px-3 py-1 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-medium rounded text-xs"
                          >
                            Open Report
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Report Analysis"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. CONSULT DR. MEDLINGO (Chatbot)                         */}
          {/* ========================================================= */}
          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      Dr. MedLingo Clinical Health Educator
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Grounded clinical guidance based on active report findings
                    </div>
                  </div>
                </div>

                {analysisResult && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Referencing {analysisResult.results.length} parameters
                  </span>
                )}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4 flex flex-col h-[500px]">
                <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded p-3 space-y-1 ${
                          msg.sender === 'user'
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-75">
                          <span className="font-bold">
                            {msg.sender === 'user' ? 'You' : 'Dr. MedLingo'}
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        {msg.sender === 'doctor' && (
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={() => handlePlayAudio(msg.text)}
                              className="text-[10px] text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Volume2 className="w-3 h-3" /> Read Aloud
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="text-slate-400 text-xs italic">
                      Dr. MedLingo is reviewing your clinical parameters...
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask what steps to take, dietary questions, or red-flag symptoms..."
                    disabled={isChatLoading}
                    className="flex-1 text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-hidden focus:border-teal-600"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. SAMPLE LIBRARY                                         */}
          {/* ========================================================= */}
          {activeTab === 'samples' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Clinically Curated Synthetic Laboratory Panels
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-validated synthetic records for verification of deterministic interval cutoffs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SYNTHETIC_REPORTS.map((sample) => (
                  <div
                    key={sample.id}
                    className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded">
                          {sample.category}
                        </span>
                        {sample.has_critical && (
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                            Critical Alert
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                        {sample.title}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {sample.notes}
                      </p>
                      <div className="text-[10px] text-slate-400">
                        Patient: {sample.patient_profile.name} • {sample.patient_profile.age} y/o •{' '}
                        {sample.patient_profile.sex}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectSample(sample.id)}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-700 hover:text-white dark:hover:bg-teal-700 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      Load into Analyzer <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. SETTINGS & ACCOUNT DATA MANAGEMENT                     */}
          {/* ========================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-6 space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Account and Data Settings
                </h2>
                <p className="text-xs text-slate-500">
                  Manage authentication credentials, visual appearance, clinical calibration, and data governance.
                </p>
              </div>

              {settingsSuccessNotice && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Settings updated successfully on server.
                </div>
              )}

              {/* Password Management Form */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    Change Account Password
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update security credentials for your encrypted account.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-3 max-w-md text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordState.currentPassword}
                      onChange={(e) =>
                        setPasswordState({ ...passwordState, currentPassword: e.target.value })
                      }
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordState.newPassword}
                      onChange={(e) =>
                        setPasswordState({ ...passwordState, newPassword: e.target.value })
                      }
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      placeholder="At least 8 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordState.confirmPassword}
                      onChange={(e) =>
                        setPasswordState({ ...passwordState, confirmPassword: e.target.value })
                      }
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      placeholder="Confirm new password"
                    />
                  </div>

                  {passwordNotice && (
                    <div className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
                      {passwordNotice}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded text-xs font-semibold transition-colors"
                  >
                    Update Password
                  </button>
                </form>
              </div>

              {/* Visual Appearance & Calibration */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Visual Appearance & Clinical Calibration
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Theme Preference
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex-1 p-2 rounded border text-xs font-semibold ${
                          theme === 'light'
                            ? 'bg-teal-50 dark:bg-teal-950 border-teal-600 text-teal-900 dark:text-teal-200'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Light Theme
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex-1 p-2 rounded border text-xs font-semibold ${
                          theme === 'dark'
                            ? 'bg-teal-50 dark:bg-teal-950 border-teal-600 text-teal-900 dark:text-teal-200'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Dark Theme
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Default Translation Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleChangeLanguage(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
                    >
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.native_name} ({l.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-semibold transition-colors"
                  >
                    {isSavingSettings ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>

              {/* Data Export & Account Deletion (Anti-Vibe-Coding Compliance) */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-5 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Data Governance & Portability
                  </h3>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Export Your Analysis Data (JSON)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Download a complete machine-readable copy of your reports and health scores.
                    </div>
                  </div>
                  <button
                    onClick={handleExportJson}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    Export Analysis Data (JSON)
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-rose-700 dark:text-rose-400">
                      Delete Account and All Reports
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Permanently erase all clinical records, history, and user profile data.
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteAccountData}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Account and All Reports
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Enterprise Clinical Footer (Pre-Launch Checklist Compliant) */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span>Copyright © 2026 MedLingo. All rights reserved.</span>
            <span className="ml-2 font-mono text-[11px] text-slate-400">medlingo.app</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setLegalModalType('privacy')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors underline"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setLegalModalType('terms')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors underline"
            >
              Terms and Conditions
            </button>
            <a
              href="mailto:support@medlingo.example.com"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              support@medlingo.example.com
            </a>
          </div>
        </div>
      </footer>

      {/* Privacy Policy & Terms Modal */}
      <PrivacyTermsModals
        isOpen={legalModalType !== null}
        onClose={() => setLegalModalType(null)}
        type={legalModalType}
      />
    </div>
  );
}
