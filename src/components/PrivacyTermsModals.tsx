import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms' | null;
}

export function PrivacyTermsModals({ isOpen, onClose, type }: ModalProps) {
  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 transition-opacity duration-150">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-lg flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === 'privacy' ? (
              <Shield className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            ) : (
              <FileText className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            )}
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              {type === 'privacy'
                ? 'MedLingo Clinical Privacy Policy'
                : 'Terms & Conditions of Service'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
          {type === 'privacy' ? (
            <>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Effective Date: October 2, 2026 • Document Version 2.1
              </p>
              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  1. Automatic On-Device PII Scrubbing
                </h3>
                <p>
                  MedLingo enforces strict privacy protections. When you upload or paste a
                  laboratory report, our deterministic redaction pipeline automatically identifies and
                  masks all Personally Identifiable Information (PII), including patient full names,
                  medical record numbers (MRN), dates of birth, phone numbers, and addresses before
                  any evaluation is conducted.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  2. Data Retention & Firestore Storage
                </h3>
                <p>
                  If you are signed in with your account, reports you explicitly choose to save are
                  stored securely in your private Google Cloud Firestore collection. You maintain full
                  data ownership and can delete individual reports or your entire account at any time
                  from the Settings tab.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  3. Non-Commercial Data Commitment
                </h3>
                <p>
                  Your medical laboratory data is never sold, shared with insurance providers, or
                  used for advertising retargeting under any circumstances.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  4. Contact & Inquiries
                </h3>
                <p>
                  For data protection inquiries or data removal requests, contact our medical
                  governance team at support@medlingo.example.com.
                </p>
              </section>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Effective Date: October 2, 2026 • Terms of Clinical Use
              </p>
              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  1. Non-Diagnostic Educational Scope
                </h3>
                <p>
                  MedLingo is a clinical health literacy and patient communication tool designed to
                  translate complex diagnostic terminology and explain standard reference intervals.
                  MedLingo does NOT provide definitive medical diagnoses, prescriptions, treatment
                  orders, or emergency triage services.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  2. Physician Consultation Required
                </h3>
                <p>
                  All generated explanations, health literacy scores, and condition matches must be
                  reviewed by a licensed healthcare provider before making any medical decisions. Never
                  discontinue or alter prescribed medications based solely on automated software
                  evaluations.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  3. Emergency Medical Disclaimer
                </h3>
                <p>
                  If you are experiencing acute symptoms such as severe chest pain, sudden shortness of
                  breath, syncope, or uncontrolled bleeding, or if a critical high/low cutoff is
                  flagged on your report, contact emergency medical services immediately.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  4. Governing Law
                </h3>
                <p>
                  These terms are governed in accordance with digital health communication standards
                  and medical software transparency guidelines.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-medium rounded text-xs transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
