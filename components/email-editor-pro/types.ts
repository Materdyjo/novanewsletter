export type BlockType = 
  | "header" 
  | "text" 
  | "image" 
  | "button" 
  | "divider" 
  | "spacer"
  | "social"
  | "footer"
  | "columns";

export interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  styles: BlockStyles;
  order: number;
  children?: EmailBlock[]; // For nested blocks (like columns)
}

export interface BlockStyles {
  // Layout
  width?: string;
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  
  // Text
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: string;
  fontWeight?: string;
  
  // Image
  imageUrl?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageAlign?: "left" | "center" | "right";
  
  // Button
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonPadding?: string;
  buttonBorderRadius?: string;
  
  // Divider
  dividerColor?: string;
  dividerHeight?: string;
  dividerWidth?: string;
  
  // Spacer
  spacerHeight?: string;
  
  // Columns
  columnLayout?: "50-50" | "33-67" | "67-33";
  column1Content?: string;
  column1Type?: "text" | "image";
  column2Content?: string;
  column2Type?: "text" | "image";
  column1ImageUrl?: string;
  column2ImageUrl?: string;
}

export interface BlockTemplate {
  type: BlockType;
  name: string;
  icon: string;
  defaultContent: string;
  defaultStyles: BlockStyles;
}
