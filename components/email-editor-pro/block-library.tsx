"use client";

import { BlockTemplate } from "./types";
import { 
  Type, 
  Image as ImageIcon, 
  Heading1, 
  Minus, 
  Square, 
  Share2,
  FileText,
  Move,
  Columns2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    type: "header",
    name: "Header",
    icon: "heading",
    defaultContent: "Newsletter Header",
    defaultStyles: {
      backgroundColor: "#ffffff",
      fontSize: "32px",
      fontFamily: "Arial, sans-serif",
      color: "#333333",
      textAlign: "center",
      padding: "32px 24px 24px 24px",
    },
  },
  {
    type: "text",
    name: "Text",
    icon: "text",
    defaultContent: "<p>Start typing your text here...</p>",
    defaultStyles: {
      backgroundColor: "#ffffff",
      fontSize: "16px",
      fontFamily: "Arial, sans-serif",
      color: "#333333",
      textAlign: "left",
      padding: "0 24px 24px 24px",
      lineHeight: "1.6",
    },
  },
  {
    type: "image",
    name: "Image",
    icon: "image",
    defaultContent: "",
    defaultStyles: {
      backgroundColor: "#ffffff",
      padding: "0",
      imageAlign: "center",
      imageWidth: "100%",
    },
  },
  {
    type: "button",
    name: "Button",
    icon: "button",
    defaultContent: "",
    defaultStyles: {
      backgroundColor: "#ffffff",
      padding: "20px",
      textAlign: "center",
      buttonText: "Click Here",
      buttonUrl: "#",
      buttonColor: "#2563eb",
      buttonTextColor: "#ffffff",
      buttonPadding: "12px 24px",
      buttonBorderRadius: "4px",
    },
  },
  {
    type: "divider",
    name: "Divider",
    icon: "divider",
    defaultContent: "",
    defaultStyles: {
      backgroundColor: "#ffffff",
      padding: "20px",
      dividerColor: "#e5e7eb",
      dividerHeight: "1px",
      dividerWidth: "100%",
    },
  },
  {
    type: "spacer",
    name: "Spacer",
    icon: "spacer",
    defaultContent: "",
    defaultStyles: {
      backgroundColor: "#ffffff",
      spacerHeight: "40px",
    },
  },
  {
    type: "columns",
    name: "Two Columns",
    icon: "columns",
    defaultContent: "",
    defaultStyles: {
      backgroundColor: "#ffffff",
      padding: "20px",
      columnLayout: "50-50",
    },
  },
];

interface BlockLibraryProps {
  onDragStart: (template: BlockTemplate) => void;
}

export function BlockLibrary({ onDragStart }: BlockLibraryProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "heading":
        return <Heading1 className="h-5 w-5" />;
      case "text":
        return <Type className="h-5 w-5" />;
      case "image":
        return <ImageIcon className="h-5 w-5" />;
      case "button":
        return <Square className="h-5 w-5" />;
      case "divider":
        return <Minus className="h-5 w-5" />;
      case "spacer":
        return <Move className="h-5 w-5" />;
      case "columns":
        return <Columns2 className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Blocks</h2>
        <p className="text-xs text-gray-500 mt-1">Drag to add</p>
      </div>
      
      <div className="p-2 space-y-1">
        {BLOCK_TEMPLATES.map((template) => (
          <div
            key={template.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("block-template", JSON.stringify(template));
              onDragStart(template);
            }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg cursor-move",
              "hover:bg-gray-50 border border-transparent hover:border-gray-200",
              "transition-colors group"
            )}
          >
            <div className="text-gray-400 group-hover:text-gray-600">
              {getIcon(template.icon)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{template.name}</div>
            </div>
            <div className="text-gray-300 group-hover:text-gray-400">
              <Move className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
