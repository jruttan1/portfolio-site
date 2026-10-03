import { documentSchema, type CaseBlock } from "../lib/admin/content";
const files = import.meta.glob("../content/case-studies/*.json", { eager: true, import: "default" });
const documents = Object.values(files).map(value => documentSchema.parse(value));
const order = ["primate", "whim", "optimate", "doppels"];
export const caseStudies = documents.map(document => ({
  ...document.root.props,
  slug: document.slug,
  skills: document.root.props.skills.split(",").map(value => value.trim()).filter(Boolean),
  sections: document.content as CaseBlock[],
})).sort((a, b) => (order.indexOf(a.slug) === -1 ? 999 : order.indexOf(a.slug)) - (order.indexOf(b.slug) === -1 ? 999 : order.indexOf(b.slug)));
export type CaseStudy = typeof caseStudies[number];
export const getCaseStudy = (slug: string) => caseStudies.find(study => study.slug === slug);
