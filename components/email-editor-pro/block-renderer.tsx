"use client";

import { useState, useRef } from "react";
import { EmailBlock } from "./types";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnContainer } from "./column-container";

interface BlockRendererProps {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (block: EmailBlock) => void;
  canEdit: boolean;
  fileInputRef?: React.RefObject<HTMLInputElement>;
}

export function BlockRenderer({ block, isSelected, onUpdate, canEdit, fileInputRef: externalFileInputRef }: BlockRendererProps) {
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;
  const textInputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdate({
        ...block,
        styles: {
          ...block.styles,
          imageUrl: base64,
        },
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageUrl = async () => {
    const url = prompt("Enter image URL (use direct image link, e.g., https://i.ibb.co/... or https://example.com/image.jpg):");
    if (url) {
      // Clean and validate URL
      let cleanUrl = url.trim();
      
      // Try to convert ImgBB page URLs to direct image URLs
      if (cleanUrl.includes('ibb.co/') && !cleanUrl.includes('i.ibb.co/') && !cleanUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        // Extract the ID from ImgBB URL (e.g., https://ibb.co/PzZg58Ry -> PzZg58Ry)
        const match = cleanUrl.match(/ibb\.co\/([^\/\?]+)/);
        if (match && match[1]) {
          const imageId = match[1];
          // Try to construct direct URL - ImgBB uses i.ibb.co for direct links
          // We'll try common extensions, but user should use the actual direct link
          alert(`⚠️ This is an ImgBB page URL, not a direct image link.\n\nTo get the direct link:\n1. Open: ${cleanUrl}\n2. Right-click the image → "Copy image address"\n3. Or click "Embed codes" → copy "Direct link"\n\nFor now, trying: https://i.ibb.co/${imageId}.jpg\n\nIf image doesn't show, use the direct link from ImgBB.`);
          // Try common extension (might not work, but worth trying)
          cleanUrl = `https://i.ibb.co/${imageId}.jpg`;
        } else {
          alert("⚠️ This looks like an ImgBB page URL.\n\nTo get the direct link:\n1. Open the image page\n2. Right-click the image → 'Copy image address'\n3. Or use the 'Direct link' from ImgBB embed codes");
        }
      }
      
      if (cleanUrl && (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('data:'))) {
        onUpdate({
          ...block,
          styles: {
            ...block.styles,
            imageUrl: cleanUrl,
          },
        });
      } else {
        alert("Please enter a valid image URL (must start with http://, https://, or data:)");
      }
    }
  };

  const renderBlock = () => {
    const styles = block.styles;

    switch (block.type) {
      case "header":
        return (
          <div
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={(e) => {
              onUpdate({
                ...block,
                content: e.currentTarget.innerHTML,
              });
            }}
            className="outline-none"
            style={{
              backgroundColor: styles.backgroundColor || "#ffffff",
              fontSize: styles.fontSize || "32px",
              fontFamily: styles.fontFamily || "Arial, sans-serif",
              color: styles.color || "#333333",
              textAlign: styles.textAlign || "center",
              padding: styles.padding || "32px 24px 24px 24px",
              fontWeight: styles.fontWeight || "bold",
            }}
            dangerouslySetInnerHTML={{ __html: block.content || "Newsletter Header" }}
          />
        );

      case "text":
        return (
          <div
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={(e) => {
              onUpdate({
                ...block,
                content: e.currentTarget.innerHTML,
              });
            }}
            onInput={(e) => {
              const el = e.target as HTMLElement;
              if (textInputTimeoutRef.current) clearTimeout(textInputTimeoutRef.current);
              textInputTimeoutRef.current = setTimeout(() => {
                const html = el.innerHTML;
                if (html !== block.content) {
                  onUpdate({ ...block, content: html });
                }
                textInputTimeoutRef.current = null;
              }, 400);
            }}
            className="outline-none min-h-[50px]"
            style={{
              backgroundColor: styles.backgroundColor || "#ffffff",
              fontSize: styles.fontSize || "16px",
              fontFamily: styles.fontFamily || "Arial, sans-serif",
              color: styles.color || "#333333",
              textAlign: styles.textAlign || "left",
              padding: styles.padding || "0 24px 24px 24px",
              lineHeight: styles.lineHeight || "1.6",
            }}
            dangerouslySetInnerHTML={{ __html: block.content || "<p>Start typing...</p>" }}
          />
        );

      case "image":
        return (
          <div
            className="relative group"
            style={{
              backgroundColor: styles.backgroundColor || "#ffffff",
              padding: styles.padding || "0",
              textAlign: styles.imageAlign || "center",
            }}
          >
            {styles.imageUrl ? (
              <img
                src={styles.imageUrl.trim()}
                alt=""
                style={{
                  width: styles.imageWidth || "100%",
                  height: styles.imageHeight || "auto",
                  maxWidth: "100%",
                  display: "block",
                }}
                className="mx-auto"
                onError={(e) => {
                  console.error("Image failed to load:", styles.imageUrl);
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm mb-2">No image</p>
                  {canEdit && (
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleImageUrl}>
                        URL
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {canEdit && styles.imageUrl && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onUpdate({
                        ...block,
                        styles: {
                          ...styles,
                          imageUrl: "",
                        },
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        );

      case "button":
        return (
          <div
            style={{
              backgroundColor: styles.backgroundColor || "#ffffff",
              padding: styles.padding || "20px",
              textAlign: styles.textAlign || "center",
            }}
          >
            <a
              href={styles.buttonUrl || "#"}
              contentEditable={canEdit}
              suppressContentEditableWarning
              onBlur={(e) => {
                onUpdate({
                  ...block,
                  styles: {
                    ...styles,
                    buttonText: e.currentTarget.textContent || "Click Here",
                  },
                });
              }}
              className="inline-block outline-none"
              style={{
                backgroundColor: styles.buttonColor || "#2563eb",
                color: styles.buttonTextColor || "#ffffff",
                padding: styles.buttonPadding || "12px 24px",
                borderRadius: styles.buttonBorderRadius || "4px",
                textDecoration: "none",
                fontSize: styles.fontSize || "16px",
                fontFamily: styles.fontFamily || "Arial, sans-serif",
                fontWeight: styles.fontWeight || "600",
              }}
            >
              {styles.buttonText || "Click Here"}
            </a>
          </div>
        );

      case "divider":
        return (
          <div
            style={{
              backgroundColor: styles.backgroundColor || "#ffffff",
              padding: styles.padding || "20px",
            }}
          >
            <hr
              style={{
                border: "none",
                borderTop: `${styles.dividerHeight || "1px"} solid ${styles.dividerColor || "#e5e7eb"}`,
                width: styles.dividerWidth || "100%",
                margin: 0,
              }}
            />
          </div>
        );

      case "spacer":
        return (
          <div
            style={{
              backgroundColor: styles.backgroundColor || "#ffffff",
              height: styles.spacerHeight || "40px",
            }}
          />
        );

      case "columns":
        return (
          <ColumnContainer
            block={block}
            onUpdate={onUpdate}
            canEdit={canEdit}
          />
        );

      default:
        return null;
    }
  };

  return <div className="w-full">{renderBlock()}</div>;
}
