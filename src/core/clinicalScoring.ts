import type {
  LabResult,
  HealthLiteracyAssessment,
  ConditionMatch,
  ReportStrength,
  ReportWeakness,
  RoadmapStep,
} from '../types/medical.ts';

/**
 * Computes an objective clinical Health Literacy Score (0-100),
 * strengths & weaknesses, 5 condition matches, and a personalized 4-step roadmap.
 * All derived 100% deterministically from the user's analyzed laboratory findings.
 */
export function evaluateClinicalAssessment(
  results: LabResult[],
  urgentNotice: string | null
): HealthLiteracyAssessment {
  if (!results || results.length === 0) {
    return {
      score: 75,
      rating: 'Preliminary Evaluation',
      strengths: [
        {
          title: 'Document Legibility',
          detail: 'Panel parameters identified with clear unit definitions.',
          relatedTest: 'General',
        },
      ],
      weaknesses: [
        {
          title: 'Limited Baseline Data',
          detail: 'Upload complete blood panel to establish longitudinal trend.',
          relatedTest: 'General',
          flag: 'unknown',
        },
      ],
      conditionMatches: [
        {
          condition: 'General Health Maintenance',
          matchPercentage: 90,
          rationale: 'Baseline wellness assessment based on submitted parameters.',
          severity: 'low',
        },
      ],
      roadmap: [
        {
          phase: 'Phase 1',
          timeframe: 'Immediate (0-24 Hours)',
          title: 'Review Parameter Accuracy',
          actions: ['Verify personal fasting status during collection.'],
        },
      ],
    };
  }

  // 1. Calculate Score (0-100)
  let score = 98;
  const normals = results.filter((r) => r.flag === 'normal');
  const abnormals = results.filter((r) => r.flag === 'low' || r.flag === 'high');
  const criticals = results.filter((r) => r.flag === 'critical_low' || r.flag === 'critical_high');

  score -= abnormals.length * 7;
  score -= criticals.length * 24;

  if (urgentNotice || criticals.length > 0) {
    score = Math.min(score, 54);
  }

  score = Math.max(18, Math.min(98, score));

  let rating = 'Optimal Stability';
  if (score < 45) {
    rating = 'Critical Attention Required';
  } else if (score < 70) {
    rating = 'Moderate Health Complexity';
  } else if (score < 85) {
    rating = 'Mild Parameter Variance';
  }

  // 2. Derive Strengths (Normal organ panels & protective factors)
  const strengths: ReportStrength[] = [];
  normals.forEach((r) => {
    if (r.test_name === 'Platelets') {
      strengths.push({
        title: 'Adequate Hemostasis & Clotting Capacity',
        detail: `Platelet count (${r.value} ${r.unit}) is safely within normal limits (${r.ref_text}), supporting natural vascular repair.`,
        relatedTest: r.test_name,
      });
    } else if (r.test_name === 'White Blood Cells') {
      strengths.push({
        title: 'Absence of Acute Leukocytosis',
        detail: `White blood cell count (${r.value} ${r.unit}) reflects stable baseline immune surveillance without acute bacterial surge.`,
        relatedTest: r.test_name,
      });
    } else if (r.test_name === 'Fasting Blood Glucose') {
      strengths.push({
        title: 'Euglycemic Fasting Regulation',
        detail: `Fasting glucose (${r.value} ${r.unit}) remains safely within non-diabetic reference margins.`,
        relatedTest: r.test_name,
      });
    } else if (r.test_name === 'Potassium') {
      strengths.push({
        title: 'Stable Myocardial Electrolyte Reserve',
        detail: `Serum potassium (${r.value} ${r.unit}) is balanced, supporting cardiac conduction stability.`,
        relatedTest: r.test_name,
      });
    } else if (r.test_name === 'Hemoglobin') {
      strengths.push({
        title: 'Adequate Oxygen-Carrying Reserve',
        detail: `Hemoglobin level (${r.value} ${r.unit}) satisfies standard physiological oxygen delivery requirements.`,
        relatedTest: r.test_name,
      });
    } else {
      strengths.push({
        title: `Normal ${r.test_name} Parameter`,
        detail: `Result of ${r.value !== null ? r.value : r.value_text} ${r.unit || ''} falls strictly within standard reference margins (${r.ref_text}).`,
        relatedTest: r.test_name,
      });
    }
  });

  if (strengths.length === 0) {
    strengths.push({
      title: 'Active Diagnostic Clarity',
      detail: 'Clear laboratory quantification permits targeted clinical decision-making by your attending physician.',
      relatedTest: 'Panel Documentation',
    });
  }

  // 3. Derive Weaknesses (Abnormal & critical flags)
  const weaknesses: ReportWeakness[] = [];
  [...criticals, ...abnormals].forEach((r) => {
    if (r.test_name === 'Potassium' && (r.flag === 'critical_high' || r.flag === 'high')) {
      weaknesses.push({
        title: 'Elevated Serum Potassium (Hyperkalemia Risk)',
        detail: `Potassium at ${r.value} ${r.unit} exceeds upper safety interval (${r.ref_text}). High potassium alters myocardial electrical conduction and requires immediate physician notification.`,
        relatedTest: r.test_name,
        flag: r.flag,
      });
    } else if (r.test_name === 'Hemoglobin' && (r.flag === 'low' || r.flag === 'critical_low')) {
      weaknesses.push({
        title: 'Sub-optimal Hemoglobin (Anemia Pattern)',
        detail: `Hemoglobin reading (${r.value} ${r.unit}) is below reference standard (${r.ref_text}), commonly contributing to cellular fatigue, pallor, and reduced exercise tolerance.`,
        relatedTest: r.test_name,
        flag: r.flag,
      });
    } else if (r.test_name === 'Total Cholesterol' && r.flag === 'high') {
      weaknesses.push({
        title: 'Atherogenic Lipid Elevation',
        detail: `Total cholesterol (${r.value} ${r.unit}) exceeds recommended upper boundary (${r.ref_text}), increasing long-term arterial plaque accumulation risk.`,
        relatedTest: r.test_name,
        flag: r.flag,
      });
    } else if (r.test_name === 'Alanine Aminotransferase' && r.flag === 'high') {
      weaknesses.push({
        title: 'Hepatic Transaminase Elevation',
        detail: `ALT level (${r.value} ${r.unit}) is above normal threshold (${r.ref_text}), indicating potential hepatocytes stress, fatty infiltration, or medication sensitivity.`,
        relatedTest: r.test_name,
        flag: r.flag,
      });
    } else if (r.test_name === 'Platelets' && (r.flag === 'low' || r.flag === 'critical_low')) {
      weaknesses.push({
        title: 'Thrombocytopenia (Low Platelets)',
        detail: `Platelet count (${r.value} ${r.unit}) is reduced below reference interval (${r.ref_text}), which may heighten minor mucosal bruising or bleeding tendencies.`,
        relatedTest: r.test_name,
        flag: r.flag,
      });
    } else {
      weaknesses.push({
        title: `Out-of-Range ${r.test_name}`,
        detail: `Result of ${r.value} ${r.unit || ''} diverges from normal biological interval (${r.ref_text}), warranting follow-up verification.`,
        relatedTest: r.test_name,
        flag: r.flag,
      });
    }
  });

  if (weaknesses.length === 0) {
    weaknesses.push({
      title: 'None Identified in Tested Markers',
      detail: 'All evaluated parameters in this report satisfy established biological reference boundaries.',
      relatedTest: 'Panel Summary',
      flag: 'normal',
    });
  }

  // 4. Compute 5 Condition Matches with match percentages
  const testMap = new Map<string, LabResult>();
  results.forEach((r) => testMap.set(r.test_name, r));

  const conditionMatches: ConditionMatch[] = [];

  // Match 1: Iron Deficiency Anemia / Microcytic Anemia
  const hgb = testMap.get('Hemoglobin');
  const hgbVal = hgb?.value ?? 14;
  let anemiaScore = 20;
  if (hgb && hgb.flag === 'critical_low') anemiaScore = 92;
  else if (hgb && hgb.flag === 'low') anemiaScore = 84;
  else if (hgb && hgbVal < 12.5) anemiaScore = 55;

  conditionMatches.push({
    condition: 'Iron Deficiency & Microcytic Anemia Pattern',
    matchPercentage: anemiaScore,
    rationale:
      anemiaScore > 70
        ? `Directly correlated with low circulating hemoglobin (${hgb?.value} ${hgb?.unit || 'g/dL'}). Indicates reduced erythrocytic oxygen-carrying capacity.`
        : 'Hemoglobin and red cell parameters show sufficient baseline stability with low anemia likelihood.',
    severity: anemiaScore > 70 ? 'high' : anemiaScore > 40 ? 'moderate' : 'low',
  });

  // Match 2: Renal Clearance & Electrolyte Imbalance / Hyperkalemia
  const pot = testMap.get('Potassium');
  let potScore = 15;
  if (pot && pot.flag === 'critical_high') potScore = 94;
  else if (pot && pot.flag === 'high') potScore = 78;
  else if (pot && pot.flag === 'critical_low') potScore = 88;
  else if (pot && pot.flag === 'low') potScore = 72;

  conditionMatches.push({
    condition: 'Renal Clearance & Electrolyte Dysregulation',
    matchPercentage: potScore,
    rationale:
      potScore > 70
        ? `Serum potassium level (${pot?.value} ${pot?.unit}) is abnormal. Suggests altered renal tubular excretion or transcellular shifts.`
        : 'Serum electrolytes indicate preserved renal filtering and ionic osmotic balance.',
    severity: potScore > 70 ? 'high' : potScore > 40 ? 'moderate' : 'low',
  });

  // Match 3: Dyslipidemia & Atherosclerotic Vascular Risk
  const chol = testMap.get('Total Cholesterol');
  let lipidScore = 22;
  if (chol && (chol.value ?? 0) > 240) lipidScore = 82;
  else if (chol && (chol.value ?? 0) > 200) lipidScore = 68;

  conditionMatches.push({
    condition: 'Atherogenic Dyslipidemia & Cardiovascular Risk',
    matchPercentage: lipidScore,
    rationale:
      lipidScore > 60
        ? `Elevated total cholesterol (${chol?.value} ${chol?.unit}) promotes progressive arterial intimal lipid deposition.`
        : 'Lipid markers do not present substantial standalone atherosclerotic risk in this panel.',
    severity: lipidScore > 70 ? 'high' : lipidScore > 40 ? 'moderate' : 'low',
  });

  // Match 4: Glycemic Regulation & Metabolic Syndrome
  const glu = testMap.get('Fasting Blood Glucose');
  let gluScore = 18;
  if (glu && (glu.value ?? 0) >= 126) gluScore = 85;
  else if (glu && (glu.value ?? 0) >= 100) gluScore = 65;
  else if (glu && (glu.value ?? 0) < 65) gluScore = 75;

  conditionMatches.push({
    condition: 'Impaired Fasting Glucose / Metabolic Syndrome',
    matchPercentage: gluScore,
    rationale:
      gluScore > 60
        ? `Fasting blood glucose (${glu?.value} ${glu?.unit}) deviates from euglycemic interval, signaling peripheral insulin resistance.`
        : 'Fasting glucose homeostatic regulation demonstrates preserved pancreatic beta-cell sensitivity.',
    severity: gluScore > 70 ? 'high' : gluScore > 40 ? 'moderate' : 'low',
  });

  // Match 5: Hepatic Transaminase Activity / Inflammatory Burden
  const alt = testMap.get('Alanine Aminotransferase');
  const wbc = testMap.get('White Blood Cells');
  let hepScore = 20;
  if (alt && alt.flag === 'high') hepScore = 76;
  if (wbc && wbc.flag === 'high') hepScore = Math.max(hepScore, 70);

  conditionMatches.push({
    condition: 'Subclinical Hepatic / Inflammatory Stress',
    matchPercentage: hepScore,
    rationale:
      hepScore > 60
        ? 'Cellular enzyme leakage or elevated circulating immune markers indicate subacute liver or systemic tissue inflammation.'
        : 'Transaminase activity and baseline leukocyte levels demonstrate absence of acute cellular necroinflammation.',
    severity: hepScore > 70 ? 'high' : hepScore > 40 ? 'moderate' : 'low',
  });

  // Sort condition matches by percentage descending
  conditionMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // 5. Build 4-Phase Vertical Animated Roadmap
  const hasCritical = urgentNotice !== null || criticals.length > 0;
  const roadmap: RoadmapStep[] = [
    {
      phase: 'Phase 1',
      timeframe: hasCritical ? 'Immediate (Next 0 - 6 Hours)' : 'Initial 24 - 48 Hours',
      title: hasCritical ? 'Emergency Clinical Triage' : 'Acute Stabilization & Observation',
      actions: hasCritical
        ? [
            'Notify your primary care doctor or present to the nearest hospital triage regarding critical lab values.',
            'Discontinue unprescribed potassium or electrolyte supplements pending medical clearance.',
            'Monitor for acute red flags: chest tightness, syncope, or irregular tachycardia.',
          ]
        : [
            'Maintain baseline oral hydration with 2.0 to 2.5 liters of clean water daily.',
            'Avoid unaccustomed heavy isometric physical exertion until results are reviewed.',
            'Document any subjective fatigue, lightheadedness, or digestive symptoms in a daily log.',
          ],
    },
    {
      phase: 'Phase 2',
      timeframe: 'Days 3 - 7',
      title: 'Targeted Nutritional & Lifestyle Adaptation',
      actions: [
        anemiaScore > 60
          ? 'Incorporate bioavailable heme and non-heme iron sources (spinach, lentils, legumes) paired with Vitamin C.'
          : 'Maintain a balanced Mediterranean-style dietary pattern rich in dietary fiber and monounsaturated lipids.',
        'Review current over-the-counter NSAIDs, supplements, and herbals that may influence renal or hepatic enzymes.',
        'Establish regular sleep hygiene (7-8 hours nightly) to promote optimal endocrine restoration.',
      ],
    },
    {
      phase: 'Phase 3',
      timeframe: 'Weeks 2 - 3',
      title: 'Formal Physician Consultation & Diagnostic Review',
      actions: [
        'Present the structured MedLingo test report and generated questions to your attending physician.',
        'Discuss whether secondary confirmatory tests (such as Serum Ferritin, Lipid Subfractions, or Repeat Electrolytes) are required.',
        'Review current prescribed medications to rule out drug-induced lab variations.',
      ],
    },
    {
      phase: 'Phase 4',
      timeframe: 'Weeks 6 - 8',
      title: 'Surveillance & Trend Verification Panel',
      actions: [
        'Schedule a focused follow-up venous blood draw to document physiological trend recovery.',
        'Compare longitudinal trajectory against baseline values to assess dietary and clinical intervention efficacy.',
        'Update your personal health record with updated interval readings.',
      ],
    },
  ];

  return {
    score,
    rating,
    strengths,
    weaknesses,
    conditionMatches,
    roadmap,
  };
}
