export const profile = {
  name: "Jack Ruttan",
  title: "AI Systems, Product, and Research",
  location: "Hamilton, Ontario",
  education: "CS + Math @ Western University",
  availability: "Open to summer 2027 internship opportunities · Grad 2028",
  experience: [
    {
      name: "Lifemark Health Group",
      role: "AI Systems Engineer · Technical Consultant",
      period: "Current",
      description: "Building internal AI tools to automate repetitive clinical and administrative work.",
      url: "https://www.lifemarkhealthgroup.ca",
      logo: "/lifemark-logo.png",
      chip: { bg: "#fde8d8", text: "#c2410c" }
    },
    {
      name: "Tech for Social Impact",
      role: "Project Manager",
      period: "2025 — 2026",
      description: "Leading development of pro-bono software projects with the Canadian Red Cross and Brain Tumour Foundation of Canada.",
      url: "https://tethos.ca",
      logo: "/tethosassociation_logo.jpeg",
      chip: { bg: "#fee2e2", text: "#991b1b" }
    },
    {
      name: "Unity Health Toronto",
      role: "Applied AI Intern",
      period: "Summer 2025",
      description: "Built clinical interview agents and evaluation pipelines for healthcare research.",
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
      description: "We compiled the first digitized Comanche dataset and a low-cost way to expand it with the goal of preserving a critically endangered language. We built a pipeline to generate translations from a small set of trusted examples, compare them with human-verified answers using normalized Levenshtein similarity, and keep only outputs that pass a quality threshold",
      venues: [
        { name: "AmericasNLP 2025", note: "Proceedings of the Fifth Workshop on NLP for Indigenous Languages of the Americas", logo: "/Association_for_Computational_Linguistics_logo.svg" }
      ]
    }
  ],
  projects: [
     {
      name: "Primate",
      slug: "primate",
      description: "Checks changed pages for UI bugs and posts screenshots in your pull request.",
      url: "https://primate.sh",
      chip: { bg: "#f1f5f9", text: "#334155" }
    },
    {
      name: "Whim",
      slug: "whim",
      description: "Plan, shop, and play in your iMessage group chat with an AI agent.",
      url: "https://github.com/chang-07/htn-26",
      prizes: [{ name: "Hack the North 2026", note: "Best Use of Linq · Cloudflare Best Agent with a Brain", logo: "/HTNLogo.148bc3f0.webp" }],
      chip: { bg: "#ffe3ec", text: "#c72462" }
    },
    {
      name: "Optimate",
      slug: "optimate",
      description: "Ranks insurance submissions by how well they fit an insurer’s risk appetite.",
      url: "https://devpost.com/software/optimate",
      prizes: [{ name: "Hack the North 2025", note: "Y Combinator Unicorn Prize · Federato RiskOps Gold Sponsor", logo: "/HTNLogo.148bc3f0.webp" }],
      chip: { bg: "#ede9fe", text: "#5b21b6" }
    },
    {
      name: "Doppels",
      slug: "doppels",
      description: "A networking prototype where AI agents talk to find common ground between people.",
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
