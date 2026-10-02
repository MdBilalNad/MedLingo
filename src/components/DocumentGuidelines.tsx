import React from 'react';
import { FileText, Shield, Eye, Check } from 'lucide-react';

export function DocumentGuidelines() {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3 text-xs">
      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
        <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" />
        <span>Clinical Document Guidelines</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 dark:text-slate-400">
        <div className="space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Supported Formats & Size
          </div>
          <p className="text-[11px] leading-relaxed">
            Standard laboratory PDF reports, scanned JPG, PNG, and clear smartphone photographs up to
            10 MB.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Parameter Legibility
          </div>
          <p className="text-[11px] leading-relaxed">
            Ensure test names, numerical values, and reference interval columns are clearly visible
            without heavy blur or glare.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Automatic Privacy Redaction
          </div>
          <p className="text-[11px] leading-relaxed">
            Patient full names, MRN numbers, dates of birth, and contact numbers are automatically
            redacted prior to evaluation.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Supported Clinical Panels
          </div>
          <p className="text-[11px] leading-relaxed">
            Complete Blood Count (CBC), Comprehensive Metabolic Panel (CMP), Lipid Panels, Thyroid
            Panels, and Renal Profiles.
          </p>
        </div>
      </div>
    </div>
  );
}
