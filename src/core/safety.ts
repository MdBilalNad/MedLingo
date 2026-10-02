import type { LabResult } from '../types/medical.ts';

export const STANDARD_DISCLAIMER_EN =
  'IMPORTANT NOTICE: MedLingo is an educational literacy tool designed to help you understand medical terminology. It does NOT provide medical diagnosis, clinical treatment plans, or prescriptions. Always consult a qualified physician or healthcare provider regarding any lab findings.';

export const DISCLAIMERS_BY_LANG: Record<string, string> = {
  en: STANDARD_DISCLAIMER_EN,
  hi: 'महत्वपूर्ण सूचना: मेडलिगो एक शैक्षिक स्वास्थ्य साक्षरता साधन है जो आपको चिकित्सा शब्दावली समझाने में सहायता करता है। यह कोई चिकित्सीय निदान, उपचार योजना या दवा की सलाह नहीं देता है। किसी भी रिपोर्ट के संबंध में हमेशा योग्य चिकित्सक से परामर्श करें।',
  es: 'AVISO IMPORTANTE: MedLingo es una herramienta educativa para ayudarle a comprender la terminología de sus análisis. NO proporciona diagnóstico médico, tratamiento ni prescripciones. Consulte siempre a un médico calificado.',
  ar: 'إشعار هام: ميدلينجو هي أداة تعليمية مصممة لمساعدتك على فهم المصطلحات المخبرية. لا تقدم تشخيصاً طبياً أو علاجاً أو وصفات دوائية. يرجى دائماً استشارة طبيب مؤهل.',
  fr: "AVIS IMPORTANT : MedLingo est un outil éducatif conçu pour vous aider à comprendre les termes de laboratoire. Il ne fournit AUCUN diagnostic médical, plan de traitement ou ordonnance. Consultez toujours un professionnel de santé qualifié.",
  bn: 'জরুরী বিজ্ঞপ্তি: মেডেলিংগো একটি শিক্ষামূলক টুল যা চিকিৎসা সংক্রান্ত পরীক্ষার ভাষা বুঝতে সাহায্য করে। এটি কোনো চিকিৎসা রোগ নির্ণয় বা ব্যবস্থাপত্র প্রদান করে না। যেকোনো ফলাফলের জন্য অবশ্যই অভিজ্ঞ চিকিৎসকের পরামর্শ নিন।',
};

/**
 * Checks results for critical values and produces prominent urgent notices if found
 */
export function checkUrgentCriticalValues(
  results: LabResult[],
  lang: string = 'en'
): string | null {
  const criticalResults = results.filter(
    (r) => r.flag === 'critical_low' || r.flag === 'critical_high'
  );

  if (criticalResults.length === 0) {
    return null;
  }

  const criticalNames = criticalResults
    .map((r) => `${r.test_name} (${r.value} ${r.unit || ''} - ${r.flag.replace('_', ' ').toUpperCase()})`)
    .join(', ');

  switch (lang) {
    case 'hi':
      return `⚠️ तत्काल ध्यान आवश्यक: आपकी रिपोर्ट में गंभीर स्तर पाए गए हैं: ${criticalNames}। कृपया तुरंत किसी नजदीकी डॉक्टर या आपातकालीन चिकित्सा केंद्र से संपर्क करें।`;
    case 'es':
      return `⚠️ ATENCIÓN URGENTE REQUERIDA: Se detectaron valores críticos en: ${criticalNames}. Se recomienda consultar de inmediato a un médico o acudir a un centro de urgencias.`;
    case 'ar':
      return `⚠️ تنبيه عاجل مطلوب: تم رصد قيم حرجة في: ${criticalNames}. يرجى مراجعة الطبيب أو أقرب مركز رعاية صحية على الفور.`;
    case 'fr':
      return `⚠️ ATTENTION URGENTE REQUISE : Des valeurs critiques ont été détectées pour : ${criticalNames}. Veuillez consulter rapidement un médecin ou vous rendre dans un service d'urgence.`;
    case 'bn':
      return `⚠️ জরুরী সতর্কতা: এই রিপোর্টটিতে আশঙ্কাজনক বা সংকটজনক মান পাওয়া গেছে: ${criticalNames}। অবিলম্বে একজন ডাক্তারের সাথে যোগাযোগ করুন।`;
    default:
      return `⚠️ URGENT CLINICAL ATTENTION ADVISED: Critical laboratory values were detected for: ${criticalNames}. Please contact your doctor or visit an urgent care center promptly.`;
  }
}

/**
 * Filter against forbidden content (diagnoses stated as definitive facts, medication prescriptions, false guarantees)
 */
export function sanitizeExplanationText(text: string): {
  cleanText: string;
  violations: string[];
} {
  const violations: string[] = [];
  let cleanText = text;

  // Patterns for definitive diagnosis stated as facts
  const diagnosticPatterns = [
    /\b(you (?:have|suffer from)(?:\s+[\w-]+){0,2}\s+(?:cancer|leukemia|diabetes|liver failure|kidney failure))\b/gi,
    /\b(this (?:confirms|proves) you have [a-z\s]+)\b/gi,
  ];

  for (const pat of diagnosticPatterns) {
    if (pat.test(cleanText)) {
      violations.push('Definitive diagnosis language detected');
      cleanText = cleanText.replace(pat, 'these findings can sometimes be associated with metabolic or clinical conditions that your physician will evaluate');
    }
  }

  // Medication prescription/dosage patterns (e.g. "take 500mg", "inject 10 units")
  const rxPatterns = [
    /\b(?:take|prescribe|administer|inject)\s+\d+\s*(?:mg|mcg|ml|g|units|pills|tablets)\b/gi,
    /\bstart taking [a-zA-Z]+\b/gi,
  ];

  for (const pat of rxPatterns) {
    if (pat.test(cleanText)) {
      violations.push('Prescription dosage instructions detected');
      cleanText = cleanText.replace(pat, 'discuss potential medication adjustments with your physician');
    }
  }

  // False guarantees
  const guaranteePatterns = [
    /\b(you are (?:completely|100%|entirely) fine)\b/gi,
    /\b(no need to see (?:a|any) doctor)\b/gi,
    /\b(nothing to worry about at all)\b/gi,
  ];

  for (const pat of guaranteePatterns) {
    if (pat.test(cleanText)) {
      violations.push('False guarantee detected');
      cleanText = cleanText.replace(pat, 'most of your results appear within expected ranges, but regular check-ups remain valuable');
    }
  }

  return { cleanText, violations };
}
