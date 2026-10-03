import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
export const collections = {
  'case-studies': defineCollection({ loader: glob({ pattern: '*.json', base: './src/content/case-studies' }) }),
};
