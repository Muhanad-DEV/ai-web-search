export const categories = [
  {
    id: "technology",
    label: "Technology (MASS & Autonomy)",
    terms: [
      "Maritime Autonomous Surface Ship*",
      "Autonomous Ship*",
      "Autonomous vessel*",
      "Unmanned Ship*",
      "Remote Ship*",
      "smart ship*",
      "Autonomous shipping",
      "Remotely Operated Ship",
      "Autonomous merchant ship*",
      "Remote Operation Centre*",
      "Remote Operating Centre",
      "Remote control Centre*",
      "shore control centre",
      "Onshore operation centre",
    ],
  },
  {
    id: "human",
    label: "Human dimension",
    terms: [
      "Human Element*",
      "Human Factor*",
      "Seafarer*",
      "E-farer",
      "non-seafarer*",
      "Crew",
      "Operator*",
      "remote operator*",
      "master*",
      "navigator*",
      "Trust in autonomy",
      "onboard personnel",
      "ship personnel",
      "human oversight",
      "human intervention",
      "mariner*",
      "Human-Machine Interaction",
      "Dynamic human-machine system",
      "Human-Machine teaming",
      "Human-Machine cooperation",
    ],
  },
  {
    id: "competency",
    label: "Competencies & Policy",
    terms: [
      "Competenc*",
      "Skill*",
      "Conceptual Framework*",
      "Framework Develop*",
      "Qualification*",
      "Proficienc*",
      "barrier*",
      "challenge*",
      "obstacle*",
      "Training",
      "Education",
      "Responsibilities",
      "barriers",
      "challenges",
      "Workload",
      "Cognitive Load",
      "Situational Awareness",
      "Decision Making",
      "curriculum development",
      "training programs",
      "guidelines",
      "standards",
      "Regulatory",
      "IMO",
      "Policy",
      "STCW",
    ],
  },
];

export const roles = [
  { id: 1, name: "Captain" },
  { id: 2, name: "Chief Officer" },
  { id: 3, name: "Second Officer (Navigator)" },
  { id: 4, name: "Third Officer" },
  { id: 5, name: "Deck Cadet" },
  { id: 6, name: "Chief Engineer" },
  { id: 7, name: "Second Engineer" },
  { id: 8, name: "Third Engineer" },
  { id: 9, name: "Fourth Engineer" },
  { id: 10, name: "Engine Cadet" },
  { id: 11, name: "Electro-Technical Officer" },
  { id: 12, name: "Chief Electrician" },
  { id: 13, name: "Radio Officer" },
  { id: 14, name: "Safety Officer" },
];

export function buildQueryFromSelections(selections) {
  // selections: { technology: string[], human: string[], competency: string[], extra?: string }
  const parts = [];
  for (const cat of categories) {
    const chosen = selections[cat.id] && selections[cat.id].length ? selections[cat.id] : [];
    if (chosen.length) {
      parts.push(`(${chosen.join(" OR ")})`);
    }
  }
  if (selections.extra && selections.extra.trim()) parts.push(`(${selections.extra.trim()})`);
  return parts.join(" AND ");
}


