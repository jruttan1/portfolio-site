export const profile = {
  name: "Jack Ruttan",
  title: "AI Systems, Product, and Research",
  location: "London, Ontario",
  education: "CS + Math @ Western University",
  availability: "Open to internship opportunities · grad 2028",
  experience: [
    {
      name: "Lifemark Health Group",
      role: "AI Systems Engineer · Technical Consultant",
      period: "Current",
      url: "https://www.lifemarkhealthgroup.ca",
      logo: "/lifemark-logo.png",
      chip: { bg: "#fde8d8", text: "#c2410c" }
    },
    {
      name: "Canadian Red Cross",
      role: "Technical Project Lead",
      period: "Fall 2025 — Winter 2026",
      description: "Led the technical direction for internal knowledge retrieval systems at a national nonprofit.",
      url: "https://redcross.ca",
      logo: "red-cross",
      chip: { bg: "#fee2e2", text: "#991b1b" }
    },
    {
      name: "Unity Health Toronto",
      role: "Applied AI Intern",
      period: "Summer 25",
      description: "Built clinical triage agents and evaluation pipelines in a hospital research setting.",
      url: "https://unityhealth.to",
      logo: "https://www.google.com/s2/favicons?sz=64&domain=unityhealth.to",
      chip: { bg: "#d1fae5", text: "#065f46" }
    }
  ],
  research: [
    {
      url: "https://aclanthology.org/2025.americasnlp-1.4/",
      pdf: "https://aclanthology.org/2025.americasnlp-1.4.pdf",
      doi: "https://doi.org/10.18653/v1/2025.americasnlp-1.4",
      title: "Advancing Uto-Aztecan Language Technologies: A Case Study on the Endangered Comanche Language",
      description: "We compiled the first digitized Comanche dataset and a low-cost way to expand it with the goal of preserving a critically endangered language. We built a pipeline togenerate translations from a small set of trusted examples, compare them with human-verified answers using normalized Levenshtein similarity, and keep only outputs that pass a quality threshold",
      venues: [
        { name: "AmericasNLP 2025", note: "Proceedings of the Fifth Workshop on NLP for Indigenous Languages of the Americas", logo: "/Association_for_Computational_Linguistics_logo.svg" }
      ]
    }
  ],
  projects: [
     {
      name: "Primate",
      description: "Agentic visual QA that catches UI bugs before they ship",
      url: "https://primate.sh",
      chip: { bg: "#f1f5f9", text: "#334155" }
    },
    {
      name: "Optimate",
      description: "AI copilot for insurance underwriting",
      url: "https://devpost.com/software/optimate",
      prizes: [{ name: "Hack the North", note: "YC Unicorn · Federato RiskOps Gold Sponsor", logo: "/HTNLogo.148bc3f0.webp" }],
      chip: { bg: "#ede9fe", text: "#5b21b6" }
    },
    {
      name: "Doppels",
      description: "Agents converse before humans connect",
      url: "https://doppels.vercel.app",
      prizes: [{ name: "McHacks", note: "Best Product Design · Top 5 Finalist", logo: "/mchacks-martlet-tight.c15b06650e3e5cda2d82cb370481b855.svg" }],
      chip: { bg: "#e0e7ff", text: "#3730a3" }
    },
  ],
  contact: [
    { label: "Email", href: "mailto:jruttan3@uwo.ca" },
    { label: "GitHub", href: "https://github.com/jruttan1" },
    { label: "LinkedIn", href: "https://linkedin.com/in/jack-ruttan" },
    { label: "X", href: "https://x.com/jruttan0" },
    { label: "Google Scholar", href: "https://scholar.google.com/citations?user=ItZcN84AAAAJ&hl=en&authuser=1" },
    { label: "Resume", href: "/Jack_Ruttan_Resume.pdf" },
    { label: "Cal.com", href: "https://cal.com/jack-ruttan" }
  ]
};
