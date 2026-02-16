"use client";

import { EmailBlock } from "./types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PropertiesPanelProps {
  block: EmailBlock | null;
  onUpdate: (block: EmailBlock) => void;
}

export function PropertiesPanel({ block, onUpdate }: PropertiesPanelProps) {
  if (!block) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <p className="text-sm text-gray-500 text-center mt-8">
          Select a block to edit its properties
        </p>
      </div>
    );
  }

  const updateStyle = (key: keyof EmailBlock["styles"], value: string) => {
    onUpdate({
      ...block,
      styles: {
        ...block.styles,
        [key]: value,
      },
    });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900 capitalize">{block.type} Settings</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Background Color */}
        <div>
          <Label className="text-xs font-medium text-gray-700">Background Color</Label>
          <div className="mt-1 flex gap-2">
            <Input
              type="color"
              value={block.styles.backgroundColor || "#ffffff"}
              onChange={(e) => updateStyle("backgroundColor", e.target.value)}
              className="w-16 h-10 p-1"
            />
            <Input
              type="text"
              value={block.styles.backgroundColor || "#ffffff"}
              onChange={(e) => updateStyle("backgroundColor", e.target.value)}
              placeholder="#ffffff"
              className="flex-1 text-sm"
            />
          </div>
        </div>

        {/* Padding */}
        <div>
          <Label className="text-xs font-medium text-gray-700">Padding</Label>
          <Input
            type="text"
            value={block.styles.padding || "20px"}
            onChange={(e) => updateStyle("padding", e.target.value)}
            placeholder="20px"
            className="mt-1 text-sm"
          />
        </div>

        {/* Text-specific properties */}
        {(block.type === "header" || block.type === "text" || block.type === "button") && (
          <>
            <div>
              <Label className="text-xs font-medium text-gray-700">Font Size</Label>
              <Input
                type="text"
                value={block.styles.fontSize || "16px"}
                onChange={(e) => updateStyle("fontSize", e.target.value)}
                placeholder="16px"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Font Family</Label>
              <Select
                value={block.styles.fontFamily || "Arial, sans-serif"}
                onValueChange={(value) => updateStyle("fontFamily", value)}
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                  <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Text Color</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="color"
                  value={block.styles.color || "#333333"}
                  onChange={(e) => updateStyle("color", e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={block.styles.color || "#333333"}
                  onChange={(e) => updateStyle("color", e.target.value)}
                  placeholder="#333333"
                  className="flex-1 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Text Align</Label>
              <Select
                value={block.styles.textAlign || "left"}
                onValueChange={(value: string) =>
                  updateStyle("textAlign", value as "left" | "center" | "right" | "justify")
                }
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="justify">Justify</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Image-specific properties */}
        {block.type === "image" && (
          <>
            <div>
              <Label className="text-xs font-medium text-gray-700">Image Width</Label>
              <Input
                type="text"
                value={block.styles.imageWidth || "100%"}
                onChange={(e) => updateStyle("imageWidth", e.target.value)}
                placeholder="100%"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Image Align</Label>
              <Select
                value={block.styles.imageAlign || "center"}
                onValueChange={(value: string) =>
                  updateStyle("imageAlign", value as "left" | "center" | "right")
                }
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Button-specific properties */}
        {block.type === "button" && (
          <>
            <div>
              <Label className="text-xs font-medium text-gray-700">Button URL</Label>
              <Input
                type="url"
                value={block.styles.buttonUrl || "#"}
                onChange={(e) => updateStyle("buttonUrl", e.target.value)}
                placeholder="https://example.com"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Button Color</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="color"
                  value={block.styles.buttonColor || "#2563eb"}
                  onChange={(e) => updateStyle("buttonColor", e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={block.styles.buttonColor || "#2563eb"}
                  onChange={(e) => updateStyle("buttonColor", e.target.value)}
                  placeholder="#2563eb"
                  className="flex-1 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Button Text Color</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="color"
                  value={block.styles.buttonTextColor || "#ffffff"}
                  onChange={(e) => updateStyle("buttonTextColor", e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={block.styles.buttonTextColor || "#ffffff"}
                  onChange={(e) => updateStyle("buttonTextColor", e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Button Padding</Label>
              <Input
                type="text"
                value={block.styles.buttonPadding || "12px 24px"}
                onChange={(e) => updateStyle("buttonPadding", e.target.value)}
                placeholder="12px 24px"
                className="mt-1 text-sm"
              />
            </div>
          </>
        )}

        {/* Divider-specific properties */}
        {block.type === "divider" && (
          <>
            <div>
              <Label className="text-xs font-medium text-gray-700">Divider Color</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="color"
                  value={block.styles.dividerColor || "#e5e7eb"}
                  onChange={(e) => updateStyle("dividerColor", e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={block.styles.dividerColor || "#e5e7eb"}
                  onChange={(e) => updateStyle("dividerColor", e.target.value)}
                  placeholder="#e5e7eb"
                  className="flex-1 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Divider Height</Label>
              <Input
                type="text"
                value={block.styles.dividerHeight || "1px"}
                onChange={(e) => updateStyle("dividerHeight", e.target.value)}
                placeholder="1px"
                className="mt-1 text-sm"
              />
            </div>
          </>
        )}

        {/* Spacer-specific properties */}
        {block.type === "spacer" && (
          <div>
            <Label className="text-xs font-medium text-gray-700">Spacer Height</Label>
            <Input
              type="text"
              value={block.styles.spacerHeight || "40px"}
              onChange={(e) => updateStyle("spacerHeight", e.target.value)}
              placeholder="40px"
              className="mt-1 text-sm"
            />
          </div>
        )}

        {/* Columns-specific properties */}
        {block.type === "columns" && (
          <div>
            <Label className="text-xs font-medium text-gray-700">Column Layout</Label>
            <Select
              value={block.styles.columnLayout || "50-50"}
              onValueChange={(value: string) =>
                updateStyle("columnLayout", value as "50-50" | "33-67" | "67-33")
              }
            >
              <SelectTrigger className="mt-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50-50">50% - 50%</SelectItem>
                <SelectItem value="33-67">33% - 67%</SelectItem>
                <SelectItem value="67-33">67% - 33%</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              Drag Text or Image blocks from the sidebar into the columns
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
