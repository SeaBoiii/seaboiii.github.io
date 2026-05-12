export interface GalleryItem {
  url: string;
  description?: string;
}

export interface Novel {
  slug: string;
  title: string;
  status: "Complete" | "Incomplete" | string;
  blurb?: string;
  genre?: string[];
  tone?: string[];
  setting?: string[];
  cover?: string;
  gallery?: GalleryItem[];
  order: number;
  // From novel_relationships.json
  seriesId?: string;
  seriesLabel?: string;
  relationType?: string;
  relatedTo?: string;
  readingOrder?: number;
  chapterCount: number;
}

export interface ChapterMeta {
  novelSlug: string;
  slug: string; // file basename without .md, e.g. "Chapter1"
  title: string;
  order: number;
  isEpilogue: boolean;
  label: string; // "Chapter 1" or "Epilogue"
}

export interface Chapter extends ChapterMeta {
  html: string;
  prev?: ChapterMeta;
  next?: ChapterMeta;
}

export interface NovelRelationship {
  related_to?: string;
  relation_type?: string;
  series_id?: string;
  series_label?: string;
  reading_order?: number;
}
