"use client";

import { useState, useRef, useEffect } from "react";
import { EmailRow, EmailContainer, ContainerType } from "./types";
import { ContainerEditor } from "./container-editor";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Type,
  Image as ImageIcon,
  Layout,
  Columns,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailEditorProps {
  initialHtml?: string;
  onContentChange: (html: string) => void;
  canEdit: boolean;
}

export function EmailEditor({
  initialHtml,
  onContentChange,
  canEdit,
}: EmailEditorProps) {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [draggedContainerId, setDraggedContainerId] = useState<string | null>(null);
  const [history, setHistory] = useState<EmailRow[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const nextIdRef = useRef(1);
  const isInitializedRef = useRef(false);

  // Save state to history
  const saveToHistory = (newRows: EmailRow[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newRows)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  };

  // Undo function
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRows(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Redo function
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRows(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (!canEdit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setRows(JSON.parse(JSON.stringify(history[newIndex])));
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setRows(JSON.parse(JSON.stringify(history[newIndex])));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, historyIndex, history]);

  // Parse initial HTML into container structure
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    let initialRows: EmailRow[] = [];
    
    if (initialHtml && initialHtml.trim()) {
      try {
        const parsed = parseHtmlToContainers(initialHtml);
        if (parsed.length > 0) {
          initialRows = parsed;
        } else {
          // Fallback to single container with HTML content
          initialRows = [
            {
              id: `row-${nextIdRef.current++}`,
              containers: [
                {
                  id: `container-${nextIdRef.current++}`,
                  type: "text",
                  content: initialHtml,
                  width: "full",
                  order: 0,
                },
              ],
              order: 0,
            },
          ];
        }
      } catch (e) {
        console.error("Error parsing HTML:", e);
        initialRows = [
          {
            id: `row-${nextIdRef.current++}`,
            containers: [
              {
                id: `container-${nextIdRef.current++}`,
                type: "text",
                content: initialHtml,
                width: "full",
                order: 0,
              },
            ],
            order: 0,
          },
        ];
      }
    } else {
      // Empty editor - start with one text container
      initialRows = [
        {
          id: `row-${nextIdRef.current++}`,
          containers: [
            {
              id: `container-${nextIdRef.current++}`,
              type: "text",
              content: "<p>Click to edit</p>",
              width: "full",
              order: 0,
            },
          ],
          order: 0,
        },
      ];
    }
    
    setRows(initialRows);
    setHistory([JSON.parse(JSON.stringify(initialRows))]);
    setHistoryIndex(0);
    isInitializedRef.current = true;
  }, [initialHtml]);

  // Convert containers to HTML whenever rows change (but skip initial render)
  useEffect(() => {
    if (!isInitializedRef.current) return;
    const html = containersToHtml(rows);
    onContentChange(html);
  }, [rows, onContentChange]);

  // Helper to update rows and save to history
  const updateRows = (updater: (prev: EmailRow[]) => EmailRow[]) => {
    setRows((prevRows) => {
      const newRows = updater(prevRows);
      saveToHistory(newRows);
      return newRows;
    });
  };

  const addContainer = (rowId: string, type: ContainerType, width: "full" | "half" = "full", position: "above" | "below" = "below", targetContainerId?: string) => {
    updateRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id === rowId) {
          const newContainer: EmailContainer = {
            id: `container-${nextIdRef.current++}`,
            type,
            content: type === "image" ? "" : type === "banner" ? "<h1>Banner Title</h1><p>Banner content</p>" : "<p>Click to edit</p>",
            width,
            order: row.containers.length,
          };

          const updatedContainers = [...row.containers];
          
          // If adding half-width container to row with full-width container, convert existing to half
          if (width === "half" && updatedContainers.length === 1 && updatedContainers[0].width === "full") {
            updatedContainers[0].width = "half";
          }

          // If adding full-width container, convert all existing to full
          if (width === "full") {
            updatedContainers.forEach((c) => {
              c.width = "full";
            });
          }

          // Insert at specific position
          if (position === "above" && targetContainerId) {
            const targetIndex = updatedContainers.findIndex((c) => c.id === targetContainerId);
            if (targetIndex !== -1) {
              updatedContainers.splice(targetIndex, 0, newContainer);
            } else {
              updatedContainers.push(newContainer);
            }
          } else {
            updatedContainers.push(newContainer);
          }

          // Update orders
          updatedContainers.forEach((c, idx) => {
            c.order = idx;
          });

          return { ...row, containers: updatedContainers };
        }
        return row;
      })
    );
  };

  const addRow = (type: ContainerType, width: "full" | "half" = "full", position: "above" | "below" = "below", targetRowId?: string) => {
    const newRow: EmailRow = {
      id: `row-${nextIdRef.current++}`,
      containers: [
        {
          id: `container-${nextIdRef.current++}`,
          type,
          content: type === "image" ? "" : type === "banner" ? "<h1>Banner Title</h1><p>Banner content</p>" : "<p>Click to edit</p>",
          width,
          order: 0,
        },
      ],
      order: rows.length,
    };
    
    updateRows((prev) => {
      if (position === "above" && targetRowId) {
        const targetIndex = prev.findIndex((r) => r.id === targetRowId);
        if (targetIndex !== -1) {
          const newRows = [...prev];
          newRows.splice(targetIndex, 0, newRow);
          // Update orders
          newRows.forEach((r, idx) => {
            r.order = idx;
          });
          return newRows;
        }
      }
      return [...prev, newRow];
    });
  };

  const updateContainer = (containerId: string, updates: Partial<EmailContainer>) => {
    updateRows((prevRows) =>
      prevRows.map((row) => ({
        ...row,
        containers: row.containers.map((container) =>
          container.id === containerId ? { ...container, ...updates } : container
        ),
      }))
    );
  };

  const deleteContainer = (containerId: string) => {
    updateRows((prevRows) =>
      prevRows
        .map((row) => ({
          ...row,
          containers: row.containers.filter((c) => c.id !== containerId),
        }))
        .filter((row) => row.containers.length > 0)
    );
    setSelectedContainerId(null);
  };

  const deleteRow = (rowId: string) => {
    updateRows((prevRows) => {
      const filtered = prevRows.filter((row) => row.id !== rowId);
      // Update orders
      filtered.forEach((r, idx) => {
        r.order = idx;
      });
      return filtered;
    });
  };

  const toggleContainerWidth = (containerId: string) => {
    updateRows((prevRows) =>
      prevRows.map((row) => {
        const container = row.containers.find((c) => c.id === containerId);
        if (!container) return row;

        const newWidth = container.width === "full" ? "half" : "full";

        // If changing to half and row has only one container, add another half container
        if (newWidth === "half" && row.containers.length === 1) {
          const newContainer: EmailContainer = {
            id: `container-${nextIdRef.current++}`,
            type: "text",
            content: "<p>Click to edit</p>",
            width: "half",
            order: 1,
          };
          return {
            ...row,
            containers: [
              { ...container, width: "half", order: 0 },
              newContainer,
            ],
          };
        }

        // If changing to full, convert all containers in row to full
        if (newWidth === "full") {
          return {
            ...row,
            containers: row.containers.map((c) => ({ ...c, width: "full" })),
          };
        }

        return {
          ...row,
          containers: row.containers.map((c) =>
            c.id === containerId ? { ...c, width: newWidth } : c
          ),
        };
      })
    );
  };

  const handleDragStart = (e: React.DragEvent, containerId: string) => {
    setDraggedContainerId(containerId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", containerId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedContainerId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    
    // Visual feedback
    const target = e.currentTarget as HTMLElement;
    if (target && !target.classList.contains("drag-over")) {
      target.classList.add("drag-over");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("drag-over");
  };

  const handleDrop = (e: React.DragEvent, targetContainerId: string, targetRowId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("drag-over");
    
    if (!draggedContainerId || draggedContainerId === targetContainerId) {
      setDraggedContainerId(null);
      return;
    }

    updateRows((prevRows) => {
      let sourceContainer: EmailContainer | null = null;
      let sourceRowIndex = -1;
      let sourceContainerIndex = -1;

      // Find source container
      prevRows.forEach((row, rowIdx) => {
        row.containers.forEach((container, containerIdx) => {
          if (container.id === draggedContainerId) {
            sourceContainer = container;
            sourceRowIndex = rowIdx;
            sourceContainerIndex = containerIdx;
          }
        });
      });

      if (!sourceContainer) return prevRows;

      const newRows = prevRows.map((row) => ({
        ...row,
        containers: [...row.containers],
      }));

      // Remove from source
      newRows[sourceRowIndex].containers = newRows[sourceRowIndex].containers.filter(
        (c) => c.id !== draggedContainerId
      );

      // If source row is now empty, remove it
      if (newRows[sourceRowIndex].containers.length === 0) {
        newRows.splice(sourceRowIndex, 1);
        // Adjust row orders
        newRows.forEach((row, idx) => {
          row.order = idx;
        });
      }

      // Find target row and insert
      const targetRowIdx = targetRowId
        ? newRows.findIndex((r) => r.id === targetRowId)
        : newRows.findIndex((r) => r.containers.some((c) => c.id === targetContainerId));

      if (targetRowIdx !== -1) {
        const targetRow = newRows[targetRowIdx];
        const targetContainerIdx = targetRow.containers.findIndex((c) => c.id === targetContainerId);
        
        if (targetContainerIdx !== -1) {
          // Insert after target container
          targetRow.containers.splice(targetContainerIdx + 1, 0, sourceContainer);
        } else {
          // Add to end of row
          targetRow.containers.push(sourceContainer);
        }
        
        // Update container orders
        targetRow.containers.forEach((c, idx) => {
          c.order = idx;
        });
      } else {
        // Create new row if target not found
        newRows.push({
          id: `row-${nextIdRef.current++}`,
          containers: [sourceContainer],
          order: newRows.length,
        });
      }

      return newRows;
    });

    setDraggedContainerId(null);
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border">
          <span className="text-sm font-medium text-gray-700">Add:</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addRow("text", "full")}
          >
            <Type className="h-4 w-4 mr-1" />
            Text Block
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addRow("image", "full")}
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            Image
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addRow("banner", "full")}
          >
            <Layout className="h-4 w-4 mr-1" />
            Banner
          </Button>
        </div>
      )}

      {rows.map((row) => (
        <div
          key={row.id}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-4 transition-all group",
            canEdit && "hover:border-blue-300 border-gray-200",
            draggedContainerId && draggedContainerId && !row.containers.some(c => c.id === draggedContainerId) && "border-blue-400 bg-blue-50/50 min-h-[100px]"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedContainerId && !row.containers.some(c => c.id === draggedContainerId)) {
              e.currentTarget.classList.add("border-blue-400", "bg-blue-50/50");
            }
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove("border-blue-400", "bg-blue-50/50");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove("border-blue-400", "bg-blue-50/50");
            if (draggedContainerId) {
              // Drop at end of row
              handleDrop(e, row.containers[row.containers.length - 1]?.id || "", row.id);
            }
          }}
        >
          {canEdit && (
            <div className="absolute -top-3 left-4 bg-white px-2 text-xs text-gray-500">
              Row {row.order + 1}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {row.containers.map((container) => (
              <ContainerEditor
                key={container.id}
                container={container}
                isSelected={selectedContainerId === container.id}
                onUpdate={(updates) => updateContainer(container.id, updates)}
                onDelete={() => deleteContainer(container.id)}
                onSelect={() => setSelectedContainerId(container.id)}
                onDragStart={(e) => handleDragStart(e, container.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, container.id, row.id)}
                onAddAbove={(type) => addContainer(row.id, type, container.width, "above", container.id)}
                canEdit={canEdit}
              />
            ))}
          </div>

          {canEdit && (
            <>
              {/* Add Above Row Button */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1 bg-white border rounded-lg shadow-sm p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addRow("text", "full", "above", row.id)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Text
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addRow("image", "full", "above", row.id)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Image
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addRow("banner", "full", "above", row.id)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Banner
                  </Button>
                </div>
              </div>
              
              {/* Row Actions */}
              <div className="mt-4 flex items-center gap-2 flex-wrap group">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addContainer(row.id, "text", "half")}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Text
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addContainer(row.id, "image", "half")}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Image
                </Button>
                {row.containers.length === 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleContainerWidth(row.containers[0].id)}
                  >
                    <Columns className="h-3 w-3 mr-1" />
                    {row.containers[0].width === "full" ? "Split to 2 Columns" : "Make Full Width"}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteRow(row.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Row
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      {rows.length === 0 && canEdit && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-400">
          <p>No content yet. Click &quot;Add&quot; buttons above to get started.</p>
        </div>
      )}
    </div>
  );
}

// Helper functions to convert between HTML and container structure
function parseHtmlToContainers(html: string): EmailRow[] {
  // Wrap HTML in a container if it's not already wrapped
  const wrappedHtml = html.trim().startsWith("<") ? html : `<div>${html}</div>`;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(wrappedHtml, "text/html");
  const rows: EmailRow[] = [];
  let rowOrder = 0;
  let containerIdCounter = 0;

  // Try to detect structure from HTML
  const body = doc.body;
  const children = Array.from(body.children);

  if (children.length === 0) {
    // If no children, check if body has content
    if (body.innerHTML.trim()) {
      return [
        {
          id: `row-${Date.now()}-${rowOrder++}`,
          containers: [
            {
              id: `container-${Date.now()}-${containerIdCounter++}`,
              type: "text",
              content: body.innerHTML,
              width: "full",
              order: 0,
            },
          ],
          order: 0,
        },
      ];
    }
    return [];
  }

  children.forEach((child) => {
    const containers: EmailContainer[] = [];
    let containerOrder = 0;

    // Check if it's an image
    const images = child.querySelectorAll("img");
    if (images.length > 0) {
      images.forEach((img) => {
        containers.push({
          id: `container-${Date.now()}-${containerIdCounter++}`,
          type: "image",
          content: (img as HTMLImageElement).src,
          width: "full",
          order: containerOrder++,
        });
      });
    }

    // Check for banner-like divs
    const hasBannerStyle = child instanceof HTMLElement && 
      (child.style.background || child.style.backgroundColor || 
       child.className.includes("banner") || child.className.includes("header"));
    
    if (hasBannerStyle && containers.length === 0) {
      containers.push({
        id: `container-${Date.now()}-${containerIdCounter++}`,
        type: "banner",
        content: child.innerHTML,
        width: "full",
        order: containerOrder++,
      });
    } else if (containers.length === 0) {
      // Regular text content
      containers.push({
        id: `container-${Date.now()}-${containerIdCounter++}`,
        type: "text",
        content: child.innerHTML || child.textContent || "",
        width: "full",
        order: containerOrder++,
      });
    }

    if (containers.length > 0) {
      rows.push({
        id: `row-${Date.now()}-${rowOrder++}`,
        containers,
        order: rowOrder - 1,
      });
    }
  });

  return rows.length > 0 ? rows : [
    {
      id: `row-${Date.now()}-${rowOrder++}`,
      containers: [
        {
          id: `container-${Date.now()}-${containerIdCounter++}`,
          type: "text",
          content: html,
          width: "full",
          order: 0,
        },
      ],
      order: 0,
    },
  ];
}

function containersToHtml(rows: EmailRow[]): string {
  if (rows.length === 0) return "";

  const htmlParts: string[] = [];

  rows.forEach((row) => {
    const rowHtml: string[] = [];
    
    row.containers.forEach((container) => {
      let containerHtml = "";

      if (container.type === "image") {
        if (container.content) {
          containerHtml = `<img src="${container.content.replace(/"/g, "&quot;")}" alt="" style="max-width: 100%; height: auto; display: block; margin: 10px 0;" />`;
        }
      } else if (container.type === "banner") {
        containerHtml = `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; margin: 20px 0; border-radius: 8px;">${container.content || ""}</div>`;
      } else {
        containerHtml = container.content || "<p></p>";
      }

      if (containerHtml) {
        if (row.containers.length > 1 && container.width === "half") {
          // Two-column layout
          rowHtml.push(`<div style="width: 48%; display: inline-block; vertical-align: top; margin: 0 1%;">${containerHtml}</div>`);
        } else {
          // Full width
          rowHtml.push(`<div style="width: 100%;">${containerHtml}</div>`);
        }
      }
    });

    if (rowHtml.length > 0) {
      htmlParts.push(`<div style="margin: 20px 0; ${row.containers.length > 1 ? 'display: flex; gap: 2%;' : ''}">${rowHtml.join("")}</div>`);
    }
  });

  return htmlParts.join("");
}
