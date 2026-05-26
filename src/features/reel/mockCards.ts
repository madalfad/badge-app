export type MockBadgeCardSection = {
  label: string;
  value: string;
};

export type MockBadgeCard = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  accentColor: string;
  code: string;
  sections: MockBadgeCardSection[];
  footer: string;
  isFavorite: boolean;
};

export const mockBadgeCards: MockBadgeCard[] = [
  {
    id: 'acls-code-meds',
    title: 'ACLS Code Meds',
    subtitle: 'Adult cardiac arrest quick reference',
    category: 'ACLS',
    accentColor: '#2DD4BF',
    code: 'ACLS-01',
    isFavorite: true,
    sections: [
      { label: 'Epinephrine', value: '1 mg IV/IO q3–5 min' },
      { label: 'Amiodarone', value: '300 mg, then 150 mg' },
      { label: 'Defib', value: 'Biphasic 120–200 J' },
      { label: 'CPR', value: '2 min cycles • EtCO₂ goal >10' },
    ],
    footer: 'Reference only • verify local protocol',
  },
  {
    id: 'peds-vitals',
    title: 'Pediatric Vitals',
    subtitle: 'Age-based ranges for rapid triage',
    category: 'PEDS',
    accentColor: '#60A5FA',
    code: 'PEDS-04',
    isFavorite: false,
    sections: [
      { label: 'Infant HR', value: '100–160 bpm' },
      { label: 'Toddler HR', value: '90–150 bpm' },
      { label: 'School age RR', value: '18–30/min' },
      { label: 'Hypotension', value: '<70 + 2×age SBP' },
    ],
    footer: 'Ranges vary by source and clinical context',
  },
  {
    id: 'vasopressor-drips',
    title: 'Vasopressor Drips',
    subtitle: 'Common starting ranges',
    category: 'ICU',
    accentColor: '#A78BFA',
    code: 'ICU-12',
    isFavorite: true,
    sections: [
      { label: 'Norepi', value: '0.01–0.3 mcg/kg/min' },
      { label: 'Epi', value: '0.01–0.5 mcg/kg/min' },
      { label: 'Vaso', value: '0.03 units/min' },
      { label: 'Phenyl', value: '0.1–3 mcg/kg/min' },
    ],
    footer: 'Titrate to MAP goal and patient response',
  },
  {
    id: 'lab-critical-values',
    title: 'Critical Labs',
    subtitle: 'High-priority values to escalate',
    category: 'LABS',
    accentColor: '#FBBF24',
    code: 'LAB-02',
    isFavorite: false,
    sections: [
      { label: 'K⁺', value: '<2.8 or >6.0 mmol/L' },
      { label: 'Glucose', value: '<50 or >500 mg/dL' },
      { label: 'Lactate', value: '>4 mmol/L' },
      { label: 'Platelets', value: '<20k/µL' },
    ],
    footer: 'Escalation thresholds are institution-specific',
  },
  {
    id: 'airway-checklist',
    title: 'Airway Setup',
    subtitle: 'Pre-intubation equipment scan',
    category: 'ED',
    accentColor: '#FB7185',
    code: 'ED-07',
    isFavorite: false,
    sections: [
      { label: 'Plan A', value: 'Video laryngoscope ready' },
      { label: 'Plan B', value: 'Bougie + backup blade' },
      { label: 'Plan C', value: 'SGA at bedside' },
      { label: 'Plan D', value: 'Front-of-neck access kit' },
    ],
    footer: 'Verbalize plan before induction',
  },
  {
    id: 'sepsis-bundle',
    title: 'Sepsis Bundle',
    subtitle: 'First-hour priorities',
    category: 'ED',
    accentColor: '#34D399',
    code: 'ED-11',
    isFavorite: true,
    sections: [
      { label: 'Cultures', value: 'Before antibiotics if no delay' },
      { label: 'Antibiotics', value: 'Broad spectrum early' },
      { label: 'Fluids', value: '30 mL/kg if hypotension' },
      { label: 'Lactate', value: 'Measure and recheck if elevated' },
    ],
    footer: 'Follow current hospital sepsis pathway',
  },
  {
    id: 'ob-hemorrhage',
    title: 'OB Hemorrhage',
    subtitle: 'Massive bleeding response cues',
    category: 'OB',
    accentColor: '#F472B6',
    code: 'OB-03',
    isFavorite: false,
    sections: [
      { label: 'Call', value: 'Activate hemorrhage team' },
      { label: 'Access', value: '2 large-bore IVs' },
      { label: 'TXA', value: '1 g IV over 10 min' },
      { label: 'MTP', value: 'Balanced blood products' },
    ],
    footer: 'Use unit-specific hemorrhage protocol',
  },
  {
    id: 'vent-basics',
    title: 'Vent Basics',
    subtitle: 'Initial adult ventilator setup',
    category: 'RT',
    accentColor: '#38BDF8',
    code: 'RT-05',
    isFavorite: false,
    sections: [
      { label: 'Mode', value: 'AC/VC or PRVC' },
      { label: 'VT', value: '6–8 mL/kg PBW' },
      { label: 'RR', value: '14–20/min' },
      { label: 'PEEP', value: '5 cmH₂O initial' },
    ],
    footer: 'Adjust to ABG, plateau pressure, and diagnosis',
  },
];
