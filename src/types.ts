export interface GameEntry {
  name: string;
  path: string;
  cover: string;
  source: string;
}

export type Screen = "home" | "games" | "media" | "settings";

export interface FocusState {
  section: number;
  item: number;
}

export type SortMode = "name" | "source" | "recent";

export interface TagDefinition {
  id: string;
  names: Record<string, string>;
}

export interface TagsData {
  definitions: TagDefinition[];
  assignments: Record<string, string[]>;
}
