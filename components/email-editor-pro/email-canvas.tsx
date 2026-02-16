"use client";

import { useState, useRef } from "react";
import { EmailBlock } from "./types";
import { BlockRenderer } from "@/components/email-editor-pro/block-renderer";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailCanvasProps {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  onBlocksChange: (blocks: EmailBlock[]) => void;
  onBlockSelect: (blockId: string | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex?: number) => void;
  canEdit: boolean;
}

export function EmailCanvas({
  blocks,
  selectedBlockId,
  onBlocksChange,
  onBlockSelect,
  onDragOver,
  onDrop,
  canEdit,
}: EmailCanvasProps) {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleBlockDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("block-id", blockId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleBlockDragEnd = (e: React.DragEvent) => {
    setDraggedBlockId(null);
    setDragOverIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleBlockDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
    onDragOver(e);
  };

  const handleBlockDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    
    const blockId = e.dataTransfer.getData("block-id");
    if (blockId && draggedBlockId) {
      const newBlocks = [...blocks];
      const sourceIndex = newBlocks.findIndex((b) => b.id === blockId);
      if (sourceIndex !== -1) {
        const [removed] = newBlocks.splice(sourceIndex, 1);
        newBlocks.splice(targetIndex, 0, removed);
        newBlocks.forEach((block, idx) => {
          block.order = idx;
        });
        onBlocksChange(newBlocks);
      }
    } else {
      onDrop(e, targetIndex);
    }
    setDraggedBlockId(null);
  };

  const moveBlock = (blockId: string, direction: "up" | "down") => {
    const newBlocks = [...blocks];
    const index = newBlocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === "down" && index < newBlocks.length - 1) {
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    }

    newBlocks.forEach((block, idx) => {
      block.order = idx;
    });
    onBlocksChange(newBlocks);
  };

  const duplicateBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    
    const newBlock: EmailBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: `block-${Date.now()}-${Math.random()}`,
      order: block.order + 1,
    };

    const newBlocks = [...blocks];
    newBlocks.splice(block.order + 1, 0, newBlock);
    newBlocks.forEach((b, idx) => {
      b.order = idx;
    });
    onBlocksChange(newBlocks);
  };

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    newBlocks.forEach((block, idx) => {
      block.order = idx;
    });
    onBlocksChange(newBlocks);
    if (selectedBlockId === blockId) {
      onBlockSelect(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-100 overflow-y-auto">
      <div className="max-w-2xl mx-auto pb-16">
        {/* Email Preview Container - matches email structure */}
        <div className="bg-[#f4f4f4] min-h-[600px] py-0">
          <div className="bg-white max-w-[600px] mx-auto shadow-lg">
          {blocks.length === 0 ? (
            <div className="flex items-center justify-center h-[600px] border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium mb-2">Start building your email</p>
                <p className="text-sm">Drag blocks from the sidebar to get started</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={cn(
                    "relative group",
                    selectedBlockId === block.id && "ring-2 ring-blue-500 ring-offset-2",
                    dragOverIndex === index && "border-t-2 border-blue-500"
                  )}
                  draggable={canEdit}
                  onDragStart={(e) => handleBlockDragStart(e, block.id)}
                  onDragEnd={handleBlockDragEnd}
                  onDragOver={(e) => handleBlockDragOver(e, index)}
                  onDrop={(e) => handleBlockDrop(e, index)}
                  onClick={() => onBlockSelect(block.id)}
                >
                  {/* Block Controls */}
                  {canEdit && selectedBlockId === block.id && (
                    <div className="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(block.id, "up");
                        }}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(block.id, "down");
                        }}
                        disabled={index === blocks.length - 1}
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Drag Handle */}
                  {canEdit && (
                    <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>
                  )}

                  {/* Block Actions */}
                  {canEdit && selectedBlockId === block.id && (
                    <div className="absolute -top-10 right-0 flex gap-1 bg-blue-500 text-white px-2 py-1 rounded-t-lg text-xs z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateBlock(block.id);
                        }}
                        className="hover:bg-blue-600 rounded px-2 py-1"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3 inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBlock(block.id);
                        }}
                        className="hover:bg-blue-600 rounded px-2 py-1"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3 inline" />
                      </button>
                    </div>
                  )}

                  {/* Block Content */}
                  <BlockRenderer
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onUpdate={(updatedBlock: EmailBlock) => {
                      const newBlocks = blocks.map((b) =>
                        b.id === block.id ? updatedBlock : b
                      );
                      onBlocksChange(newBlocks);
                    }}
                    canEdit={canEdit}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Drop Zone at End */}
          {canEdit && (
            <div
              className={cn(
                "h-4 border-t-2 border-dashed transition-colors",
                dragOverIndex === blocks.length ? "border-blue-500 bg-blue-50" : "border-transparent"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(blocks.length);
                onDragOver(e);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleBlockDrop(e, blocks.length)}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
