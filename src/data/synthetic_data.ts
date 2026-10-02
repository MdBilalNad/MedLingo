import type { SyntheticReport } from '../types/medical.ts';

export const SYNTHETIC_REPORTS: SyntheticReport[] = [
  {
    id: 'cbc-anemia',
    title: 'Complete Blood Count (CBC) - Mild Anemia',
    category: 'Hematology',
    patient_profile: {
      name: 'Maria Santos',
      age: 38,
      sex: 'female',
    },
    has_critical: false,
    notes: 'Low hemoglobin and hematocrit indicative of mild microcytic anemia, normal platelets.',
    raw_text: `METROPOLITAN GENERAL HOSPITAL - PATHOLOGY LAB
Patient Name: Maria Santos
DOB: 14/06/1988    Age: 38    Sex: Female
Patient ID: MGH-98421    Referred By: Dr. Evans, MD
Sample Date: 12-OCT-2026    Status: Completed

TEST NAME                      RESULT      UNIT         REFERENCE RANGE
-------------------------------------------------------------------------
Hemoglobin                     10.2        g/dL         12.1 - 15.1     [L]
White Blood Cells              6.4         x10^3/uL     4.5 - 11.0
Platelets                      265         x10^3/uL     150 - 450
Red Blood Cells                3.7         x10^6/uL     4.0 - 5.2       [L]
-------------------------------------------------------------------------
Comments: Slight microcytosis observed. Advise clinical correlation.`,
    expected_results: [
      {
        test_name: 'Hemoglobin',
        raw_name: 'Hemoglobin',
        value: 10.2,
        value_text: '10.2',
        unit: 'g/dL',
        ref_low: 12.1,
        ref_high: 15.1,
        ref_text: '12.1 - 15.1',
        flag: 'low',
        confidence: 0.98,
      },
      {
        test_name: 'White Blood Cells',
        raw_name: 'White Blood Cells',
        value: 6.4,
        value_text: '6.4',
        unit: 'x10^3/uL',
        ref_low: 4.5,
        ref_high: 11.0,
        ref_text: '4.5 - 11.0',
        flag: 'normal',
        confidence: 0.98,
      },
      {
        test_name: 'Platelets',
        raw_name: 'Platelets',
        value: 265,
        value_text: '265',
        unit: 'x10^3/uL',
        ref_low: 150,
        ref_high: 450,
        ref_text: '150 - 450',
        flag: 'normal',
        confidence: 0.98,
      },
    ],
  },
  {
    id: 'lipid-profile-high',
    title: 'Lipid Panel - Elevated Cholesterol & Triglycerides',
    category: 'Cardiovascular',
    patient_profile: {
      name: 'Ahmed Al-Mansoor',
      age: 52,
      sex: 'male',
    },
    has_critical: false,
    notes: 'High LDL cholesterol and high triglycerides, low HDL.',
    raw_text: `APEX DIAGNOSTIC LABORATORIES
Patient: Ahmed Al-Mansoor
Age: 52    Gender: Male    ID: APX-771204
Physician: Dr. Sarah Jenkins
Collection: Fasting 12 hours

LIPID HEALTH PANEL
Test Name                    Value       Units        Desirable Range
Total Cholesterol            248         mg/dL        < 200            [H]
LDL Cholesterol              162         mg/dL        < 100            [H]
HDL Cholesterol              36          mg/dL        > 40             [L]
Triglycerides                250         mg/dL        < 150            [H]`,
    expected_results: [
      {
        test_name: 'Total Cholesterol',
        raw_name: 'Total Cholesterol',
        value: 248,
        value_text: '248',
        unit: 'mg/dL',
        ref_low: null,
        ref_high: 200,
        ref_text: '< 200',
        flag: 'high',
        confidence: 0.97,
      },
      {
        test_name: 'LDL Cholesterol',
        raw_name: 'LDL Cholesterol',
        value: 162,
        value_text: '162',
        unit: 'mg/dL',
        ref_low: null,
        ref_high: 100,
        ref_text: '< 100',
        flag: 'high',
        confidence: 0.97,
      },
      {
        test_name: 'HDL Cholesterol',
        raw_name: 'HDL Cholesterol',
        value: 36,
        value_text: '36',
        unit: 'mg/dL',
        ref_low: 40,
        ref_high: null,
        ref_text: '> 40',
        flag: 'low',
        confidence: 0.97,
      },
      {
        test_name: 'Triglycerides',
        raw_name: 'Triglycerides',
        value: 250,
        value_text: '250',
        unit: 'mg/dL',
        ref_low: null,
        ref_high: 150,
        ref_text: '< 150',
        flag: 'high',
        confidence: 0.97,
      },
    ],
  },
  {
    id: 'critical-potassium',
    title: 'Electrolytes Panel - CRITICAL High Potassium',
    category: 'Critical Care / Renal',
    patient_profile: {
      name: 'Robert Chen',
      age: 64,
      sex: 'male',
    },
    has_critical: true,
    notes: 'Potassium at 6.8 mmol/L which triggers immediate red alert for hyperkalemia.',
    raw_text: `ST. JUDE REGIONAL MEDICAL LAB
Patient Name: Robert Chen
MRN: 8841920    DOB: 02/09/1962    Sex: M
Location: Outpatient Clinic    Attending: Dr. K. Patel

SERUM ELECTROLYTE REPORT:
Potassium (Serum)            6.8         mmol/L       3.5 - 5.0        ***CRITICAL HIGH***
Sodium                       138         mmol/L       135 - 145        NORMAL
Creatinine                   2.6         mg/dL        0.7 - 1.3        HIGH
Blood Urea Nitrogen          45          mg/dL        7 - 20           HIGH`,
    expected_results: [
      {
        test_name: 'Potassium',
        raw_name: 'Potassium (Serum)',
        value: 6.8,
        value_text: '6.8',
        unit: 'mmol/L',
        ref_low: 3.5,
        ref_high: 5.0,
        ref_text: '3.5 - 5.0',
        flag: 'critical_high',
        confidence: 0.99,
      },
      {
        test_name: 'Sodium',
        raw_name: 'Sodium',
        value: 138,
        value_text: '138',
        unit: 'mmol/L',
        ref_low: 135,
        ref_high: 145,
        ref_text: '135 - 145',
        flag: 'normal',
        confidence: 0.98,
      },
      {
        test_name: 'Creatinine',
        raw_name: 'Creatinine',
        value: 2.6,
        value_text: '2.6',
        unit: 'mg/dL',
        ref_low: 0.7,
        ref_high: 1.3,
        ref_text: '0.7 - 1.3',
        flag: 'high',
        confidence: 0.98,
      },
      {
        test_name: 'Blood Urea Nitrogen',
        raw_name: 'Blood Urea Nitrogen',
        value: 45,
        value_text: '45',
        unit: 'mg/dL',
        ref_low: 7,
        ref_high: 20,
        ref_text: '7 - 20',
        flag: 'high',
        confidence: 0.98,
      },
    ],
  },
  {
    id: 'diabetes-glycemic',
    title: 'Glycemic Assessment - Prediabetes / Elevated HbA1c',
    category: 'Endocrinology',
    patient_profile: {
      name: 'Sunita Sharma',
      age: 46,
      sex: 'female',
    },
    has_critical: false,
    notes: 'Fasting glucose of 118 mg/dL and HbA1c of 6.2% indicating prediabetes.',
    raw_text: `HEALTHFIRST CLINICAL LABORATORIES
Patient: Sunita Sharma
DOB: 19/11/1979    Age: 46    Sex: F
Lab No: HF-40291    Date: 28-SEP-2026

DIABETES MONITORING PANEL
Test                           Result    Units     Biological Ref Interval
Fasting Plasma Glucose (FBS)   118       mg/dL     70 - 99           [ELEVATED]
HbA1c (Glycated Hemoglobin)    6.2       %         4.0 - 5.6         [PREDIABETIC]
Estimated Average Glucose      131       mg/dL     ---`,
    expected_results: [
      {
        test_name: 'Fasting Blood Glucose',
        raw_name: 'Fasting Plasma Glucose (FBS)',
        value: 118,
        value_text: '118',
        unit: 'mg/dL',
        ref_low: 70,
        ref_high: 99,
        ref_text: '70 - 99',
        flag: 'high',
        confidence: 0.97,
      },
      {
        test_name: 'HbA1c',
        raw_name: 'HbA1c (Glycated Hemoglobin)',
        value: 6.2,
        value_text: '6.2',
        unit: '%',
        ref_low: 4.0,
        ref_high: 5.6,
        ref_text: '4.0 - 5.6',
        flag: 'high',
        confidence: 0.98,
      },
    ],
  },
  {
    id: 'liver-enzymes-high',
    title: 'Liver Function Profile - Elevated ALT & AST',
    category: 'Hepatology',
    patient_profile: {
      name: 'Carlos Mendez',
      age: 41,
      sex: 'male',
    },
    has_critical: false,
    notes: 'Elevated transaminases ALT 88 U/L and AST 74 U/L.',
    raw_text: `BIO-REFERENCE HEALTH SYSTEMS
Patient Name: Carlos Mendez
Age: 41    Sex: Male    MRN: BR-55019
Physician: Dr. L. Gomez

HEPATIC FUNCTION PANEL:
Alanine Aminotransferase (ALT/SGPT)    88    U/L    7 - 55     HIGH
Aspartate Aminotransferase (AST/SGOT)   74    U/L    8 - 48     HIGH
Total Protein                          7.2   g/dL   6.0 - 8.3  NORMAL
Albumin                                4.4   g/dL   3.5 - 5.0  NORMAL`,
    expected_results: [
      {
        test_name: 'Alanine Aminotransferase',
        raw_name: 'Alanine Aminotransferase (ALT/SGPT)',
        value: 88,
        value_text: '88',
        unit: 'U/L',
        ref_low: 7,
        ref_high: 55,
        ref_text: '7 - 55',
        flag: 'high',
        confidence: 0.98,
      },
      {
        test_name: 'Aspartate Aminotransferase',
        raw_name: 'Aspartate Aminotransferase (AST/SGOT)',
        value: 74,
        value_text: '74',
        unit: 'U/L',
        ref_low: 8,
        ref_high: 48,
        ref_text: '8 - 48',
        flag: 'high',
        confidence: 0.98,
      },
    ],
  },
  {
    id: 'vitamin-deficiency',
    title: 'Vitamin & Micronutrient Panel - Low Vitamin D',
    category: 'Nutrition',
    patient_profile: {
      name: 'Fatima Zahra',
      age: 29,
      sex: 'female',
    },
    has_critical: false,
    notes: 'Severely deficient Vitamin D (14 ng/mL) and borderline B12.',
    raw_text: `WELLNESS PATHOLOGY LABS
Patient: Fatima Zahra
Age: 29    Sex: Female    ID: WPL-10928
Doctor: Dr. A. Rahman

SPECIALTY VITAMINS:
25-OH Vitamin D Total         14         ng/mL        30 - 100       [DEFICIENT]
Vitamin B12                   230        pg/mL        200 - 900      [NORMAL/LOW]`,
    expected_results: [
      {
        test_name: 'Vitamin D (25-Hydroxy)',
        raw_name: '25-OH Vitamin D Total',
        value: 14,
        value_text: '14',
        unit: 'ng/mL',
        ref_low: 30,
        ref_high: 100,
        ref_text: '30 - 100',
        flag: 'low',
        confidence: 0.97,
      },
      {
        test_name: 'Vitamin B12',
        raw_name: 'Vitamin B12',
        value: 230,
        value_text: '230',
        unit: 'pg/mL',
        ref_low: 200,
        ref_high: 900,
        ref_text: '200 - 900',
        flag: 'normal',
        confidence: 0.97,
      },
    ],
  },
  {
    id: 'thyroid-tsh-high',
    title: 'Thyroid Function - Elevated TSH (Hypothyroidism)',
    category: 'Endocrinology',
    patient_profile: {
      name: 'Jean-Luc Dubois',
      age: 58,
      sex: 'male',
    },
    has_critical: false,
    notes: 'TSH elevated at 8.4 uIU/mL.',
    raw_text: `CENTRE MEDICAL DE BIOLOGIE
Nom du Patient: Jean-Luc Dubois
Age: 58    Sexe: Masculin    Dossier: CMD-76192
Medecin: Dr. Moreau

BILAN THYROIDIEN:
Thyroid Stimulating Hormone (TSH)    8.4    uIU/mL    0.4 - 4.5    ELEVE`,
    expected_results: [
      {
        test_name: 'Thyroid Stimulating Hormone',
        raw_name: 'Thyroid Stimulating Hormone (TSH)',
        value: 8.4,
        value_text: '8.4',
        unit: 'uIU/mL',
        ref_low: 0.4,
        ref_high: 4.5,
        ref_text: '0.4 - 4.5',
        flag: 'high',
        confidence: 0.99,
      },
    ],
  },
  {
    id: 'missing-ranges-fallback',
    title: 'Report with Missing Reference Ranges (KB Fallback Test)',
    category: 'Edge Case / Validation',
    patient_profile: {
      name: 'Ananya Roy',
      age: 33,
      sex: 'female',
    },
    has_critical: false,
    notes: 'Demonstrates deterministic fallback to knowledge base ranges when report lacks intervals.',
    raw_text: `COMMUNITY CLINIC HEALTH CHECK
Patient: Ananya Roy
Age: 33    Sex: Female    ID: CCH-44910

RESULTS SUMMARY (No ranges printed on report):
Hemoglobin: 11.2 g/dL
Total Cholesterol: 215 mg/dL
Platelet Count: 280 x10^3/uL`,
    expected_results: [
      {
        test_name: 'Hemoglobin',
        raw_name: 'Hemoglobin',
        value: 11.2,
        value_text: '11.2',
        unit: 'g/dL',
        ref_low: 12.1,
        ref_high: 15.1,
        ref_text: '12.1 - 15.1',
        flag: 'low',
        confidence: 0.95,
      },
      {
        test_name: 'Total Cholesterol',
        raw_name: 'Total Cholesterol',
        value: 215,
        value_text: '215',
        unit: 'mg/dL',
        ref_low: 100,
        ref_high: 199,
        ref_text: '100 - 199',
        flag: 'high',
        confidence: 0.95,
      },
      {
        test_name: 'Platelets',
        raw_name: 'Platelet Count',
        value: 280,
        value_text: '280',
        unit: 'x10^3/uL',
        ref_low: 150,
        ref_high: 450,
        ref_text: '150 - 450',
        flag: 'normal',
        confidence: 0.95,
      },
    ],
  },
];
