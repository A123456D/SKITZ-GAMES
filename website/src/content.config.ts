import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const games = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/games' }),
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		tagline: z.string().optional(),
		cover: z.string(),
		preview: z.string().optional(),
		screenshots: z.array(z.string()).default([]),
		featured: z.boolean().default(false),
		released: z.boolean().default(true),
		platforms: z.object({
			web: z.boolean().default(true),
			windows: z.boolean().default(false),
			android: z.boolean().default(false),
			macos: z.boolean().default(false),
			linux: z.boolean().default(false),
			ios: z.boolean().default(false),
		}),
		webPlayPath: z.string().default('web/index.html'),
		downloads: z
			.object({
				windows: z.string().optional(),
				android: z.string().optional(),
				macos: z.string().optional(),
				linux: z.string().optional(),
			})
			.default({}),
		appStoreUrl: z.string().url().optional(),
		playStoreUrl: z.string().url().optional(),
		genre: z.string().optional(),
	}),
});

export const collections = { games };
