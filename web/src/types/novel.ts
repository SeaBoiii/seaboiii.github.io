export interface GalleryItem {
  url: string;
  description?: string;
}

export type EpilogueType = "none" | "single" | "sequential" | "branching";

export interface ChapterMeta {
  novelSlug: string;
  slug: string;
  /** Raw front-matter title */
  title: string;
  /** Cleaned title with redundant prefix ("Chapter X -", "Epilogue -") stripped */
  displayTitle: string;
  order: number;
  isEpilogue: boolean;
  epilogueType: EpilogueType;
  /** sequential: "I"/"II"/"III"; branching: "A"/"B" */
  epilogueKey: string;
  /** Short label used in lists: "01", "Epi", "Epi I", "Epi A" */
  label: string;
  /** Full label used in chapter header: "Chapter 1", "Epilogue", "Epilogue I", "Epilogue A" */
  fullLabel: string;
}

export interface Chapter extends ChapterMeta {
  html: string;
  prev?: ChapterMeta;
  next?: ChapterMeta;
  /** Sibling endings shown when epilogueType === "branching" */
  branchSiblings?: ChapterMeta[];
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
  /** Newest chapter file mtime (unix ms), used for "newest first" sort */
  lastChapterMtime: number;
  // From novel_relationships.json
  seriesId?: string;
  seriesLabel?: string;
  relationType?: string;
  relatedTo?: string;
  readingOrder?: number;
  chapterCount: number;
}

export interface NovelRelationship {
  related_to?: string;
  relation_type?: string;
  series_id?: string;
  series_label?: string;
  reading_order?: number;
}
