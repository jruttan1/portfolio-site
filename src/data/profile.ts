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
      description: "Building AI systems that improve workflow and productivity across Lifemark's internal CRM and IME platform.",
      highlights: [
        "Working directly with stakeholders to identify operational problems and shape practical solutions",
        "Combining hands-on engineering with technical consulting across internal teams"
      ],
      url: "https://www.lifemarkhealthgroup.ca",
      logo: "/lifemark-logo.png",
      chip: { bg: "#fde8d8", text: "#c2410c" }
    },
    {
      name: "Canadian Red Cross",
      role: "Technical Project Lead",
      period: "Fall 2025 — Winter 2026",
      description: "Led the technical direction for internal knowledge retrieval systems at a national nonprofit.",
      highlights: [
        "Translated an ambiguous operational need into a usable internal tool",
        "Coordinated technical decisions across stakeholders and project contributors"
      ],
      url: "https://redcross.ca",
      logo: "red-cross",
      chip: { bg: "#fee2e2", text: "#991b1b" }
    },
    {
      name: "Unity Health Toronto",
      role: "Applied AI Intern",
      period: "Summer 25",
      description: "Built clinical triage agents and evaluation pipelines in a hospital research setting.",
      highlights: [
        "Prototyped agent workflows for a high-stakes clinical context",
        "Created evaluation processes to make model behaviour easier to inspect and improve"
      ],
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
    { label: "Google Scholar", href: "#" }, // TODO: add Google Scholar URL
    { label: "Resume", href: "#" }, // TODO: add résumé URL
    { label: "Cal.com", href: "#" } // TODO: add Cal.com URL
  ]
};
