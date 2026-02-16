"use client";

import { useState } from "react";
import { EmailBlock } from "./types";
import { BlockRenderer } from "./block-renderer";
import { ImageIcon, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnContainerProps {
  block: EmailBlock;
  onUpdate: (block: EmailBlock) => void;
  canEdit: boolean;
}

export function ColumnContainer({ block, onUpdate, canEdit }: ColumnContainerProps) {
  const [dragOverColumn, setDragOverColumn] = useState<1 | 2 | null>(null);
  const styles = block.styles;
  const layout = styles.columnLayout || "50-50";
  const [width1, width2] = layout === "50-50" 
    ? ["50%", "50%"] 
    : layout === "33-67" 
    ? ["33.33%", "66.67%"] 
    : ["66.67%", "33.33%"];

  const column1Block = block.children?.[0];
  const column2Block = block.children?.[1];

  const handleDrop = (e: React.DragEvent, columnNum: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);

    const templateData = e.dataTransfer.getData("block-template");
    if (!templateData) return;

    try {
      const template = JSON.parse(templateData);
      // Only allow text or image blocks in columns
      if (template.type !== "text" && template.type !== "image") {
        return;
      }

      const newBlock: EmailBlock = {
        id: `block-${Date.now()}-${Math.random()}`,
        type: template.type,
        content: template.defaultContent,
        styles: { ...template.defaultStyles },
        order: 0,
      };

      const newChildren = [...(block.children || [])];
      if (columnNum === 1) {
        newChildren[0] = newBlock;
      } else {
        newChildren[1] = newBlock;
      }

      onUpdate({
        ...block,
        children: newChildren,
      });
    } catch (e) {
      console.error("Error parsing template:", e);
    }
  };

  const handleColumnBlockUpdate = (updatedBlock: EmailBlock, columnNum: 1 | 2) => {
    const newChildren = [...(block.children || [])];
    if (columnNum === 1) {
      newChildren[0] = updatedBlock;
    } else {
      newChildren[1] = updatedBlock;
    }
    onUpdate({
      ...block,
      children: newChildren,
    });
  };

  const handleColumnBlockDelete = (columnNum: 1 | 2) => {
    const newChildren = [...(block.children || [])];
    if (columnNum === 1) {
      newChildren[0] = {
        id: `block-${Date.now()}-col1-${Math.random()}`,
        type: "text",
        content: "",
        styles: {},
        order: 0,
      };
    } else {
      newChildren[1] = {
        id: `block-${Date.now()}-col2-${Math.random()}`,
        type: "text",
        content: "",
        styles: {},
        order: 1,
      };
    }
    onUpdate({
      ...block,
      children: newChildren,
    });
  };

  const renderColumn = (columnNum: 1 | 2) => {
    const columnBlock = columnNum === 1 ? column1Block : column2Block;
    const isEmpty = !columnBlock || (columnBlock.type === "text" && !columnBlock.content.trim());

    return (
      <td
        width={columnNum === 1 ? width1 : width2}
        style={{
          padding: "10px",
          verticalAlign: "top",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverColumn(columnNum);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverColumn(null);
        }}
        onDrop={(e) => handleDrop(e, columnNum)}
        className={cn(
          "relative min-h-[100px]",
          dragOverColumn === columnNum && "bg-blue-50 border-2 border-blue-300 border-dashed"
        )}
      >
        {isEmpty ? (
          <div className="w-full h-full min-h-[100px] border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center p-4">
            <div className="text-center text-gray-400">
              {canEdit ? (
                <>
                  <p className="text-sm font-medium mb-2">Empty Column</p>
                  <p className="text-xs mb-3">Drag a block here</p>
                  <div className="flex gap-2 justify-center">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Type className="h-4 w-4" />
                      <span>Text</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <ImageIcon className="h-4 w-4" />
                      <span>Image</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm">Empty</p>
              )}
            </div>
          </div>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <BlockRenderer
              block={columnBlock}
              isSelected={false}
              onUpdate={(updatedBlock) => handleColumnBlockUpdate(updatedBlock, columnNum)}
              canEdit={canEdit}
            />
            {canEdit && (
              <button
                onClick={() => handleColumnBlockDelete(columnNum)}
                className="mt-2 text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </td>
    );
  };

  return (
    <div
      style={{
        backgroundColor: styles.backgroundColor || "#ffffff",
        padding: styles.padding || "20px",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <table
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        style={{
          borderCollapse: "collapse",
          width: "100%",
        }}
      >
        <tr>
          {renderColumn(1)}
          {renderColumn(2)}
        </tr>
      </table>
    </div>
  );
}
