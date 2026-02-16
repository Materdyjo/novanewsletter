"use client";

import { useState, useRef, useEffect } from "react";
import { EmailContainer } from "./types";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Image as ImageIcon, Type, Layout, Palette, Plus, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContainerEditorProps {
  container: EmailContainer;
  isSelected: boolean;
  onUpdate: (container: EmailContainer) => void;
  onDelete: () => void;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAddAbove?: (type: "text" | "image" | "banner") => void;
  canEdit: boolean;
}

export function ContainerEditor({
  container,
  isSelected,
  onUpdate,
  onDelete,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddAbove,
  canEdit,
}: ContainerEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(container.content);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalContent(container.content);
  }, [container.content]);

  const handleContentChange = () => {
    if (contentEditableRef.current) {
      const newContent = contentEditableRef.current.innerHTML;
      setLocalContent(newContent);
      // Debounce updates to avoid too many history entries
      onUpdate({ ...container, content: newContent });
    }
  };

  // Handle paste events to clean up pasted content
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    handleContentChange();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdate({ ...container, content: base64 });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageUrl = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      onUpdate({ ...container, content: url });
    }
  };

  const handleBackgroundColorChange = (color: string) => {
    onUpdate({
      ...container,
      style: {
        ...container.style,
        backgroundColor: color,
      },
    });
  };

  const applyFormat = (command: string, value?: string) => {
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
      document.execCommand(command, false, value);
      handleContentChange();
    }
  };

  const renderContent = () => {
    if (container.type === "image") {
      return (
        <div className="relative group">
          {container.content ? (
            <img
              src={container.content}
              alt=""
              className="w-full h-auto max-h-96 object-contain bg-gray-50 rounded"
              style={{ ...container.style }}
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
              <div className="text-center text-gray-400">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">No image</p>
              </div>
            </div>
          )}
          {canEdit && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleImageUrl}
                >
                  URL
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
    }

    if (container.type === "banner") {
      return (
        <div
          ref={contentEditableRef}
          contentEditable={canEdit}
          suppressContentEditableWarning
          onInput={handleContentChange}
          onPaste={handlePaste}
          onBlur={() => setIsEditing(false)}
          onFocus={() => setIsEditing(true)}
          onClick={(e) => {
            // Stop propagation so container doesn't get selected when clicking banner text
            e.stopPropagation();
          }}
          className={cn(
            "p-8 rounded-lg text-center min-h-[100px] outline-none cursor-text",
            isEditing && "ring-2 ring-blue-500 ring-offset-2"
          )}
          style={{
            backgroundColor: container.style?.backgroundColor || "#f3f4f6",
            color: container.style?.color || "#333333",
            ...container.style,
          }}
          dangerouslySetInnerHTML={{ __html: container.content || "<h1>Banner Title</h1><p>Banner content</p>" }}
        />
      );
    }

    // Text container
    return (
      <div
        ref={contentEditableRef}
        contentEditable={canEdit}
        suppressContentEditableWarning
        onInput={handleContentChange}
        onPaste={handlePaste}
        onBlur={() => setIsEditing(false)}
        onFocus={() => setIsEditing(true)}
        onClick={(e) => {
          // Stop propagation so container doesn't get selected when clicking text
          e.stopPropagation();
        }}
        className={cn(
          "min-h-[100px] p-4 outline-none cursor-text",
          isEditing && "ring-2 ring-blue-500 ring-offset-2"
        )}
        style={{
          textAlign: container.style?.textAlign || "left",
          fontSize: container.style?.fontSize || "16px",
          color: container.style?.color || "#333",
          backgroundColor: container.style?.backgroundColor || "transparent",
          ...container.style,
        }}
        dangerouslySetInnerHTML={{ __html: container.content || "<p>Click to edit</p>" }}
      />
    );
  };

  return (
    <div
      className={cn(
        "relative border-2 rounded-lg transition-all duration-200 cursor-pointer group",
        isSelected
          ? "border-blue-500 shadow-lg ring-2 ring-blue-200"
          : "border-transparent hover:border-gray-300",
        container.width === "half" ? "w-full md:w-1/2" : "w-full"
      )}
      onClick={(e) => {
        // Don't select if clicking directly on contentEditable area or formatting buttons
        const target = e.target as HTMLElement;
        if (
          target.isContentEditable ||
          target.closest('[contenteditable="true"]') ||
          target.closest('button') ||
          target.closest('input[type="color"]')
        ) {
          // Let the contentEditable or button handle the click
          return;
        }
        onSelect();
        // Focus contentEditable if it's a text or banner container
        if ((container.type === "text" || container.type === "banner") && contentEditableRef.current) {
          setTimeout(() => {
            contentEditableRef.current?.focus();
          }, 0);
        }
      }}
      draggable={canEdit}
      onDragStart={(e) => {
        e.currentTarget.style.opacity = "0.5";
        onDragStart(e);
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = "1";
        onDragEnd(e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.classList.contains("drag-over")) {
          e.currentTarget.classList.add("border-blue-400", "bg-blue-50");
        }
        onDragOver(e);
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
        onDragLeave(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
        onDrop(e);
      }}
      data-container-id={container.id}
    >
      {canEdit && (
        <>
          <div className="absolute -left-8 top-0 bottom-0 flex items-center z-20">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 cursor-move"
              onMouseDown={(e) => e.stopPropagation()}
              title="Drag to reorder"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          </div>
          
          {/* Add Above Container Button */}
          {onAddAbove && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <div className="flex gap-1 bg-white border rounded-lg shadow-sm p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAbove("text");
                  }}
                  className="px-2 py-1 text-xs hover:bg-gray-100 rounded"
                  title="Add text above"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  Text
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAbove("image");
                  }}
                  className="px-2 py-1 text-xs hover:bg-gray-100 rounded"
                  title="Add image above"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  Image
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAbove("banner");
                  }}
                  className="px-2 py-1 text-xs hover:bg-gray-100 rounded"
                  title="Add banner above"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  Banner
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {canEdit && isSelected && (
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between bg-blue-500 text-white px-2 py-1 rounded-t-lg text-xs z-10">
          <div className="flex items-center gap-2">
            <span className="capitalize">{container.type}</span>
            <span className="text-blue-200">
              {container.width === "full" ? "Full Width" : "Half Width"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {(container.type === "text" || container.type === "banner") && (
              <>
                {/* Text Formatting Buttons */}
                <div className="flex items-center gap-0.5 border-l border-blue-400 pl-1 ml-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyFormat("bold");
                    }}
                    className="hover:bg-blue-600 rounded p-1"
                    title="Bold (Ctrl+B)"
                  >
                    <Bold className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyFormat("italic");
                    }}
                    className="hover:bg-blue-600 rounded p-1"
                    title="Italic (Ctrl+I)"
                  >
                    <Italic className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyFormat("underline");
                    }}
                    className="hover:bg-blue-600 rounded p-1"
                    title="Underline (Ctrl+U)"
                  >
                    <Underline className="h-3 w-3" />
                  </button>
                </div>
                {/* Background Color Picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={container.style?.backgroundColor || "#ffffff"}
                    onChange={(e) => handleBackgroundColorChange(e.target.value)}
                    className="w-6 h-6 cursor-pointer border rounded opacity-80 hover:opacity-100"
                    title="Background Color"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="hover:bg-blue-600 rounded p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div 
        className="bg-white rounded-lg p-2"
        onDoubleClick={(e) => {
          // Double-click to focus and start editing
          if ((container.type === "text" || container.type === "banner") && contentEditableRef.current) {
            e.stopPropagation();
            contentEditableRef.current.focus();
            // Place cursor at end of text
            const range = document.createRange();
            range.selectNodeContents(contentEditableRef.current);
            range.collapse(false);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}
