export type CaseStudy = {
  slug: string;
  name: string;
  eyebrow: string;
  screenshots: Array<{ src: string; title: string; caption: string }>;
  title: string;
  role?: string;
  timeline: string;
  team: string;
  skills: string[];
  media?: string;
  poster?: string;
  mediaAspectRatio?: string;
  demoNote?: string;
  featureDemos?: Array<{ src: string; poster: string; title: string; caption: string; aspectRatio: string }>;
  externalUrl: string;
  externalLabel: string;
  overview: string;
  personalContext?: { title: string; body: string };
  contributions?: Array<{ title: string; body: string }>;
  processTitle?: string;
  process?: string;
  outcomeTitle: string;
  outcomeNote?: string;
  outcomes: string[];
};

export const caseStudies: CaseStudy[] = [
  {
    "slug": "primate",
    "featureDemos": [
      {
        "src": "/projects/primate/mobile-pr-review.mp4",
        "poster": "/projects/primate/mobile-pr-review.jpg",
        "title": "Reviewing a PR on a phone",
        "caption": "Conor reviews the new landing page from his phone using the desktop, tablet, and mobile screenshots in the PR.",
        "aspectRatio": "480 / 1044"
      }
    ],
    "screenshots": [
      {
        "src": "/projects/primate/landing-page.png",
        "title": "The landing page",
        "caption": ""
      },
      {
        "src": "/projects/primate/comment-triggered-qa.jpeg",
        "title": "Tests requested in a PR comment",
        "caption": "A developer asks @primate to test the account switcher. The bot queues the run and replies with a link."
      },
      {
        "src": "/projects/primate/visual-regression-finding.jpeg",
        "title": "A bug caught during review",
        "caption": "Primate caught an upside-down “Join the Waitlist” button and attached a screenshot to the report."
      }
    ],
    "name": "Primate",
    "eyebrow": "Primate · 2026",
    "title": "Browser testing for pull requests",
    "role": "Co-founder and engineer",
    "timeline": "About 6 months · 2026",
    "team": "Conor Roberts, Jeremy Bell, and me",
    "skills": [
      "React",
      "Python",
      "Playwright",
      "AWS",
      "Docker"
    ],
    "media": "/primate-demo-vid.mp4",
    "externalUrl": "https://primate.sh",
    "externalLabel": "Visit Primate",
    "overview": "Primate reads a code diff, checks the affected pages in a browser, and posts screenshots and bug reports on the pull request.",
    "personalContext": {
      "title": "Background",
      "body": "Conor works full-time at Stripe and reached out to me about building Primate. I ended up spending about six months on it with him and Jeremy."
    },
    "contributions": [
      {
        "title": "Figuring out which pages to check",
        "body": "A big part of my work was figuring out where a code change actually showed up in the app. We used a crawler to build a sitemap, then built a reverse dependency graph from the frontend imports. If a component changed, we could follow the graph back to the pages that used it. If the change was already in a page, we could just go there."
      },
      {
        "title": "The review agent",
        "body": "I spent a lot of time building and researching the review loop: how the agent decided what to check, used the browser, and reported what it found. I also looked into visual prompting strategies like Set-of-Mark to help it understand what it was looking at on the page."
      },
      {
        "title": "Browser tooling",
        "body": "We didn’t want to pay for a browser provider, so I built our own browser sandbox and browser-use commands from scratch in Python."
      }
    ],
    "outcomeTitle": "Where it got to",
    "outcomes": [],
    "outcomeNote": "We didn’t make it work as a business. We had a few design partners and interest from startups, but unfortunately never got a paying customer. I learned a ton from this experience. I went deep into trying to perfect the agent loop, spent a ridiculous amount of time building our own browser tooling, and learned what it takes to try to grow and promote a product."
  },
  {
    "slug": "whim",
    "name": "Whim",
    "eyebrow": "Whim · Hack the North 2026",
    "title": "An iMessage agent for plans and games",
    "role": "Agent tools and full-stack development",
    "timeline": "September 2026",
    "team": "Lucian Lavric, Karan Anand, Sheng Chang Li, and me",
    "skills": [
      "TypeScript",
      "Cloudflare Workers",
      "Durable Objects",
      "OpenAI",
      "Linq",
      "SwiftUI",
      "Browserbase"
    ],
    "featureDemos": [
      {
        "src": "/projects/whim/group-trip.mp4",
        "poster": "/projects/whim/group-trip.jpg",
        "title": "Planning a trip",
        "caption": "The group asks for a trip, votes on flights, and gets shopping suggestions.",
        "aspectRatio": "720 / 1566"
      },
      {
        "src": "/projects/whim/generated-blackjack.mp4",
        "poster": "/projects/whim/generated-blackjack.jpg",
        "title": "Generating a game",
        "caption": "A request for blackjack becomes a playable iMessage card.",
        "aspectRatio": "720 / 1560"
      }
    ],
    "media": "/demos/whim.mp4",
    "poster": "/demos/whim-poster.jpg",
    "mediaAspectRatio": "1 / 1",
    "externalUrl": "https://github.com/chang-07/htn-26",
    "externalLabel": "View on GitHub",
    "demoNote": "The iMessage widgets were a TestFlight prototype and aren’t available on the public website.",
    "overview": "Whim is an agent you can add to an iMessage group chat to help plan trips, shop, and generate games. It shares interactive cards that everyone in the chat can use.",
    "contributions": [
      {
        "title": "Seeing what the agent was actually doing",
        "body": "The main thing I built was a telemetry dashboard to help us build and debug Whim. There were so many tools, APIs, and connections that it was hard to tell what was breaking or why a run was taking so long. Each run had its own tab, with turns, tool calls, inputs, and responses shown as nodes in a trace. I integrated Sentry and tracked turn timings, token usage per run, and p95 model response latency. We could open a run, look through each step, and see where the time was going and what had failed."
      },
      {
        "title": "Deciding when to search or fetch a page",
        "body": "Browserbase had APIs for web search and fetching a page. I used Jev, a lightweight classification model from Typesafe, to score which one made sense for what the agent was trying to do. I wanted to avoid spending more on browser calls than we needed to."
      },
      {
        "title": "Browser tools and tying things together",
        "body": "Browserbase took care of a lot of the browser work. I connected skills and APIs from browse.sh so the agent could look up things like hiking routes and DoorDash menus. I was also the glue guy for a lot of this, getting the agent, iMessage widgets, and web app to work together."
      },
      {
        "title": "The web app and iMessage sync",
        "body": "I built the whole web app, including the frontend, and connected it to what was happening in iMessage. Users signed up with their phone number. Whenever the group finished building a trip or generated a widget, we hit an API to save it in the database and link it to their account."
      }
    ],
    "screenshots": [
      {
        "src": "/projects/whim/telemetry-dashboard.png",
        "title": "Debugging an agent run",
        "caption": "Here, a request to generate a pool game hit an HTTP 403 during Jev relevance scoring. The dashboard brings the error, run timings, and activity trace together."
      },
      {
        "src": "/projects/whim/landing-page.png",
        "title": "The signup page",
        "caption": "Users enter a phone number, then continue setup over iMessage."
      }
    ],
    "processTitle": "How it fits together",
    "process": "We ran the agent on Cloudflare Workers and gave each chat a Durable Object to keep its conversation history and plan state. Linq connected it to iMessage, and OpenAI handled reasoning and tool calls. We built the native widgets in SwiftUI and had the model generate structured game definitions that our runtime checked before running.",
    "outcomeTitle": "Hack the North 2026",
    "outcomes": [
      "Best Use of Linq",
      "Cloudflare: Best Agent with a Brain"
    ],
    "personalContext": {
      "title": "The idea",
      "body": "We built Whim at Hack the North because we wanted to see how much we could do without leaving iMessage. Group chats are already where people make plans, so we wanted to let them actually do something with those plans there too."
    }
  },
  {
    "slug": "optimate",
    "role": "Product design and full-stack development",
    "contributions": [
      {
        "title": "Product design and full-stack work",
        "body": "I did some of the overall product design and built features across the frontend and backend. One was an LLM chat tied to a specific policy, so an underwriter could ask questions about it. I also worked on some of the risk processing logic."
      }
    ],
    "screenshots": [
      {
        "src": "/projects/optimate/appetite-analysis.png",
        "title": "Reviewing a submission",
        "caption": "The policy details, appetite score, and reasons for the recommendation in one view."
      }
    ],
    "name": "Optimate",
    "eyebrow": "Optimate · Hack the North 2025",
    "title": "An underwriting prototype",
    "timeline": "September 2025",
    "team": "Karan Anand, Lucas Vuong, Tanuj Dargan, and me",
    "skills": [
      "Next.js",
      "Python",
      "Cohere",
      "AWS",
      "Data visualization"
    ],
    "media": "/demos/optimate.mp4",
    "externalUrl": "https://devpost.com/software/optimate",
    "externalLabel": "View on Devpost",
    "overview": "Optimate helps underwriters decide which insurance submissions to look at first, based on the risks their company wants to cover.",
    "processTitle": "How it works",
    "process": "We took the policy data they gave us and added more context. For example, we researched the risk of natural disasters based on where a policy was located. We then used Cohere Rerank with the company’s risk appetite as input to rank the policies by how well they fit. The dashboard let underwriters look through the ranking, open individual policies, and compare them with charts and maps.",
    "outcomeTitle": "Hack the North 2025",
    "outcomes": [
      "Federato’s RiskOps challenge winner",
      "Y Combinator Unicorn Prize"
    ],
    "personalContext": {
      "title": "The project",
      "body": "We built this for Federato’s challenge at Hack the North 2025. They gave us a dataset of insurance policy details and asked us to rethink how underwriters review submissions."
    }
  },
  {
    "slug": "doppels",
    "screenshots": [
      {
        "src": "/projects/doppels/agent-conversation.png",
        "title": "An agent conversation",
        "caption": "The judge updates the match score as the two agents talk."
      }
    ],
    "name": "Doppels",
    "eyebrow": "Doppels · McHacks 2026",
    "title": "A networking prototype",
    "role": "Primary developer",
    "timeline": "2026",
    "team": "Karan Anand, Yazdan Rasoulzadeh, Eldiiar Bekbolotov, and me",
    "skills": [],
    "media": "/demos/doppels.mp4",
    "externalUrl": "https://doppels.vercel.app",
    "externalLabel": "Visit Doppels",
    "overview": "Doppels lets AI agents have a conversation on behalf of two people to see what they have in common. A third LLM judges the conversation as it goes and scores the match.",
    "personalContext": {
      "title": "My part",
      "body": "I built pretty much all of Doppels at McHacks, apart from some frontend design that my teammates worked on. We wanted to see if having agents talk first could help people find someone they’d want to meet."
    },
    "processTitle": "How the scoring works",
    "process": "The judge scores the conversation live as the agents talk, rather than waiting until the end. We gave it a scale in the system prompt: 100% meant a perfect match, and around 90% meant a very good match with some differences or weaknesses in the conversation. Those numbers were arbitrary. It was a hackathon proof of concept, and we didn’t test whether a high score actually led to a good connection.",
    "outcomeTitle": "McHacks 2026",
    "outcomes": [
      "Best Product Design",
      "Top-five overall finalist"
    ]
  }
];

export const getCaseStudy = (slug: string) => caseStudies.find((study) => study.slug === slug);
