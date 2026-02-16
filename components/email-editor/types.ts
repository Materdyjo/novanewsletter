export type ContainerType = "text" | "image" | "banner";

export interface EmailContainer {
  id: string;
  type: ContainerType;
  content: string;
  width: "full" | "half"; // full = 1 column, half = 2 columns
  order: number;
  style?: {
    backgroundColor?: string;
    padding?: string;
    textAlign?: "left" | "center" | "right" | "justify";
    fontSize?: string;
    color?: string;
  };
}

export interface EmailRow {
  id: string;
  containers: EmailContainer[];
  order: number;
}
