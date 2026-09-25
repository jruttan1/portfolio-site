export type CaseStudy = {
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  role: string;
  timeline: string;
  team: string;
  skills: string[];
  media: string;
  externalUrl: string;
  externalLabel: string;
  overview: string;
  problemTitle: string;
  problem: string;
  solutionTitle: string;
  solution: string;
  features: Array<{ title: string; body: string }>;
  processTitle: string;
  process: string;
  processSteps: string[];
  outcomeTitle: string;
  outcomes: string[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "primate",
    name: "Primate",
    eyebrow: "Primate · Product 2026",
    title: "Automated visual QA for frontend pull requests",
    role: "Founder and engineer",
    timeline: "2026",
    team: "Independent project",
    skills: ["React", "Python", "Playwright", "AWS", "Docker"],
    media: "/primate-demo-vid.mp4",
    externalUrl: "https://primate.sh",
    externalLabel: "Visit Primate",
    overview: "Primate reviews frontend changes, tests the affected interface in a browser, and adds screenshots and reproduction steps to the pull request.",
    problemTitle: "A code review does not show the rendered result.",
    problem: "Frontend pull requests can pass review while introducing layout, interaction, or responsive regressions. Manual browser checks catch those issues, but they are difficult to repeat consistently on every change.",
    solutionTitle: "Targeted browser checks built from pull request context.",
    solution: "Primate uses the diff to decide what to test, runs those checks against an isolated preview, and returns evidence to the pull request.",
    features: [
      { title: "Diff-aware planning", body: "Maps changed files and components to the routes and interface states most likely to be affected." },
      { title: "Browser execution", body: "Navigates real product flows and checks behavior at the rendered-page level." },
      { title: "Review evidence", body: "Attaches screenshots, recordings, and reproduction steps to each reported issue." }
    ],
    processTitle: "From code change to browser evidence",
    process: "Each run narrows the test surface before opening the browser, then records enough context for a developer to verify the result.",
    processSteps: ["Inspect the diff and affected routes", "Provision an isolated preview environment", "Navigate the relevant flows", "Return findings to the pull request"],
    outcomeTitle: "Current output",
    outcomes: ["Focused test plans based on the changed code", "Browser evidence attached to individual findings", "Reproduction steps that can be checked by a developer"]
  },
  {
    slug: "optimate",
    name: "Optimate",
    eyebrow: "Optimate · Hack the North 2025",
    title: "Decision support for insurance underwriting",
    role: "Full-stack and AI engineer",
    timeline: "September 2025",
    team: "4 developers",
    skills: ["Next.js", "Python", "Cohere", "AWS", "Data visualization"],
    media: "/optimate-demo-1758064916274.mp4",
    externalUrl: "https://devpost.com/software/optimate",
    externalLabel: "View on Devpost",
    overview: "Optimate ranks insurance submissions using policy data and underwriting guidelines, then shows the data behind each recommendation.",
    problemTitle: "Underwriting information is spread across several sources.",
    problem: "A submission can involve policy details, carrier appetite, location, loss history, and internal guidelines. Comparing those signals manually makes it harder to prioritize work and explain a decision.",
    solutionTitle: "Rank submissions and expose the evidence behind the ranking.",
    solution: "Optimate combines structured risk data with retrieval over underwriting guidelines. Each recommendation links back to the signals and guideline excerpts that influenced it.",
    features: [
      { title: "Submission ranking", body: "Orders incoming policies using carrier appetite and risk signals." },
      { title: "Grounded explanations", body: "Retrieves relevant guidelines and includes them with the recommendation." },
      { title: "Portfolio views", body: "Uses charts and geographic views to show risk patterns across submissions." }
    ],
    processTitle: "A working prototype built during Hack the North",
    process: "The team scoped the product around one underwriting workflow and built the data, retrieval, explanation, and visualization layers in parallel.",
    processSteps: ["Ingest and normalize policy data", "Retrieve relevant appetite guidelines", "Generate evidence-backed explanations", "Visualize portfolio-level patterns"],
    outcomeTitle: "Hack the North 2025",
    outcomes: ["Winner of Federato's RiskOps challenge", "Winner of the Y Combinator Unicorn Prize", "Functional end-to-end prototype completed during the hackathon"]
  },
  {
    slug: "doppels",
    name: "Doppels",
    eyebrow: "Doppels · McHacks 2026",
    title: "Agent-assisted professional matching",
    role: "Product and AI engineer",
    timeline: "2026",
    team: "Hackathon team",
    skills: ["Agent systems", "Product design", "Web development", "Prototyping"],
    media: "/doppels-demo.mp4",
    externalUrl: "https://doppels.vercel.app",
    externalLabel: "Visit Doppels",
    overview: "Doppels creates a profile-based agent, runs short conversations between agents, and surfaces people with overlapping goals or interests.",
    problemTitle: "Profiles show credentials, not whether a conversation will be useful.",
    problem: "Professional networks make it easy to find people by title or company, but provide limited context about shared goals, working styles, or a reason to connect now.",
    solutionTitle: "Use a short agent conversation as the matching layer.",
    solution: "Doppels creates an agent from each person's background and preferences. Agents exchange context, evaluate mutual relevance, and prepare a short explanation before either person is introduced.",
    features: [
      { title: "Profile-based agent", body: "Builds a compact representation from a person's experience, interests, and stated goals." },
      { title: "Agent conversation", body: "Lets two agents exchange the context needed to evaluate a potential introduction." },
      { title: "Match summary", body: "Shows why the connection may be useful and gives both people a starting point." }
    ],
    processTitle: "A narrow prototype focused on the matching loop",
    process: "The hackathon build concentrated on the shortest complete path from onboarding to an explained match.",
    processSteps: ["Collect background and preferences", "Create a personal agent", "Run agent-to-agent conversations", "Surface matches with an explanation"],
    outcomeTitle: "McHacks 2026",
    outcomes: ["Best Product Design", "Top-five overall finalist", "Working onboarding, agent conversation, and matching flow"]
  }
];

export const getCaseStudy = (slug: string) => caseStudies.find((study) => study.slug === slug);
