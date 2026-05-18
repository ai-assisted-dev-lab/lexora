export type CatalogFilter = string;

export type CatalogTone = "azure" | "cyan" | "mint" | "sky" | "violet";

export interface CatalogDeck {
  id: string;
  title: string;
  description: string;
  level: string;
  wordCount: number;
  categories: string[];
  topics: string[];
  tags: string[];
  section: "popular" | "recommended";
  featured: boolean;
  tone: CatalogTone;
}
