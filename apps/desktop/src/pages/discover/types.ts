export type CatalogTone = "azure" | "cyan" | "mint" | "sky" | "violet";

export interface CatalogDeck {
  id: number;
  slug: string;
  title: string;
  description: string;
  level: string;
  wordCount: number;
  tags: string[];
  packName: string;
  installed: boolean;
  // Derived client-side for display purposes
  tone: CatalogTone;
  featured: boolean;
  section: "popular" | "recommended";
}
