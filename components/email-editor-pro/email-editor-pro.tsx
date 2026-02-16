"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { EmailBlock, BlockTemplate } from "./types";
import { BlockLibrary } from "./block-library";
import { EmailCanvas } from "./email-canvas";
import { PropertiesPanel } from "./properties-panel";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailEditorProProps {
  initialHtml?: string;
  onContentChange: (html: string) => void;
  canEdit: boolean;
}

export function EmailEditorPro({
  initialHtml,
  onContentChange,
  canEdit,
}: EmailEditorProProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [history, setHistory] = useState<EmailBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isInitializedRef = useRef(false);

  // Parse HTML to blocks
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    if (initialHtml && initialHtml.trim()) {
      try {
        // Extract body content if HTML is already wrapped
        let htmlToParse = initialHtml;
        if (htmlToParse.includes("<body>")) {
          const bodyMatch = htmlToParse.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          if (bodyMatch && bodyMatch[1]) {
            htmlToParse = bodyMatch[1];
          }
        }
        // Extract content from email-container if present
        if (htmlToParse.includes("email-container")) {
          const containerMatch = htmlToParse.match(/<td[^>]*>([\s\S]*)<\/td>/i);
          if (containerMatch && containerMatch[1]) {
            htmlToParse = containerMatch[1];
          }
        }
        // Try to extract innermost td content from nested table structure
        // Our structure: table > tr > td > table > tr > td > [blocks]
        // Extract the innermost td that contains the actual blocks
        if (htmlToParse.includes("<table") && htmlToParse.includes("<td")) {
          // Find all td elements and get the innermost one (deepest nested)
          const tempParser = new DOMParser();
          const tempDoc = tempParser.parseFromString(htmlToParse, "text/html");
          const allTds = tempDoc.querySelectorAll('td');
          if (allTds.length > 0) {
            // Find the td with the most direct block children (h1, div with content, etc.)
            let bestTd: Element | null = null;
            let maxBlockChildren = 0;
            allTds.forEach((td) => {
              const blockChildren = Array.from(td.children).filter((child) => {
                const tag = child.tagName.toLowerCase();
                return tag === 'h1' || tag === 'h2' || tag === 'h3' || 
                       tag === 'div' || tag === 'img' || tag === 'a' || 
                       tag === 'hr' || tag === 'table';
              }).length;
              if (blockChildren > maxBlockChildren) {
                maxBlockChildren = blockChildren;
                bestTd = td;
              }
            });
            if (bestTd && (bestTd as HTMLElement).innerHTML.trim()) {
              htmlToParse = (bestTd as HTMLElement).innerHTML;
            }
          }
        }
        
        const parsed = parseHtmlToBlocks(htmlToParse);
        if (parsed.length > 0) {
          setBlocks(parsed);
          setHistory([parsed]);
          setHistoryIndex(0);
        }
      } catch (e) {
        console.error("Error parsing HTML:", e);
      }
    }
    isInitializedRef.current = true;
  }, [initialHtml]);

  // Convert blocks to HTML
  useEffect(() => {
    if (!isInitializedRef.current) return;
    const html = blocksToHtml(blocks);
    // Only call onContentChange if we have actual content
    if (html && html.trim()) {
      onContentChange(html);
    } else if (blocks.length === 0) {
      // If no blocks, send empty string
      onContentChange("");
    }
  }, [blocks, onContentChange]);

  // Save to history
  const saveToHistory = (newBlocks: EmailBlock[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newBlocks)));
      return newHistory.slice(-50);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  };

  const handleBlocksChange = (newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
  };

  const handleDragStart = (_template: BlockTemplate) => {
    // Visual feedback for drag start can be added here if needed
    // Currently handled by browser's default drag behavior
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();

    const templateData = e.dataTransfer.getData("block-template");
    if (!templateData) return;

    try {
      const template: BlockTemplate = JSON.parse(templateData);
      const newBlock: EmailBlock = {
        id: `block-${Date.now()}-${Math.random()}`,
        type: template.type,
        content: template.defaultContent,
        styles: { ...template.defaultStyles },
        order: targetIndex !== undefined ? targetIndex : blocks.length,
        // Initialize columns block with empty children
        children: template.type === "columns" ? [
          { id: `block-${Date.now()}-col1-${Math.random()}`, type: "text", content: "", styles: {}, order: 0 },
          { id: `block-${Date.now()}-col2-${Math.random()}`, type: "text", content: "", styles: {}, order: 1 },
        ] : undefined,
      };

      const newBlocks = [...blocks];
      if (targetIndex !== undefined) {
        newBlocks.splice(targetIndex, 0, newBlock);
      } else {
        newBlocks.push(newBlock);
      }
      newBlocks.forEach((block, idx) => {
        block.order = idx;
      });

      handleBlocksChange(newBlocks);
    } catch (e) {
      console.error("Error parsing template:", e);
    }
  };

  const undo = useCallback(() => {
    setHistoryIndex((currentIndex) => {
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        setHistory((currentHistory) => {
          if (currentHistory[newIndex]) {
            setBlocks(JSON.parse(JSON.stringify(currentHistory[newIndex])));
          }
          return currentHistory;
        });
        return newIndex;
      }
      return currentIndex;
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex((currentIndex) => {
      if (currentIndex < history.length - 1) {
        const newIndex = currentIndex + 1;
        setHistory((currentHistory) => {
          if (currentHistory[newIndex]) {
            setBlocks(JSON.parse(JSON.stringify(currentHistory[newIndex])));
          }
          return currentHistory;
        });
        return newIndex;
      }
      return currentIndex;
    });
  }, [history.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!canEdit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, undo, redo]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Block Library Sidebar */}
      {canEdit && <BlockLibrary onDragStart={handleDragStart} />}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        {canEdit && (
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === "desktop" ? "default" : "outline"}
                onClick={() => setViewMode("desktop")}
              >
                <Monitor className="h-4 w-4 mr-1" />
                Desktop
              </Button>
              <Button
                size="sm"
                variant={viewMode === "mobile" ? "default" : "outline"}
                onClick={() => setViewMode("mobile")}
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={undo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className={cn("flex-1 overflow-y-auto", viewMode === "mobile" && "flex justify-center")}>
          <div className={cn("min-h-full", viewMode === "mobile" && "w-full max-w-md")}>
            <EmailCanvas
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onBlocksChange={handleBlocksChange}
              onBlockSelect={setSelectedBlockId}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              canEdit={canEdit}
            />
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      {canEdit && (
        <PropertiesPanel block={selectedBlock} onUpdate={(updatedBlock) => {
          const newBlocks = blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));
          handleBlocksChange(newBlocks);
        }} />
      )}
    </div>
  );
}

// Helper functions
function parseHtmlToBlocks(html: string): EmailBlock[] {
  if (!html || !html.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: EmailBlock[] = [];
  let order = 0;

  // Find the main content container
  // Gemini HTML: body > [h1, p, div, etc.] (direct content) OR body > div > [content]
  // Our HTML: body > table > tr > td > table > tr > td > [blocks] (nested tables)
  let contentContainer: Element | null = null;
  
  // Strategy 1: If body has a single wrapper div, use ITS children (so we get h1, p, div... not just one div)
  const bodyChildren = Array.from(doc.body.children);
  if (bodyChildren.length === 1 && bodyChildren[0].tagName.toLowerCase() === 'div') {
    const wrapperDiv = bodyChildren[0];
    const wrapperChildren = Array.from(wrapperDiv.children).filter((child) => {
      const tag = child.tagName.toLowerCase();
      return tag === 'h1' || tag === 'h2' || tag === 'h3' || 
             tag === 'div' || tag === 'p' || tag === 'img' || 
             tag === 'a' || tag === 'hr' || tag === 'table';
    });
    if (wrapperChildren.length > 0) {
      contentContainer = wrapperDiv;
    }
  }
  
  // Strategy 2: Body has single table (Gemini sometimes wraps in table) - use first td's content
  if (!contentContainer && bodyChildren.length === 1 && bodyChildren[0].tagName.toLowerCase() === 'table') {
    const firstTd = (bodyChildren[0] as HTMLTableElement).querySelector('td');
    if (firstTd && firstTd.innerHTML.trim()) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = firstTd.innerHTML;
      const tdChildren = Array.from(tempDiv.children).filter((c) => {
        const t = c.tagName.toLowerCase();
        return t === 'h1' || t === 'h2' || t === 'h3' || t === 'div' || t === 'p' || t === 'img' || t === 'a' || t === 'hr' || t === 'table';
      });
      if (tdChildren.length > 0) {
        contentContainer = tempDiv;
        // We'll use tempDiv's children below; we need to set children from tempDiv
      }
    }
  }
  
  // Strategy 3: Body has direct block children (Gemini format)
  if (!contentContainer) {
    const bodyDirectChildren = Array.from(doc.body.children).filter((child) => {
      const tag = child.tagName.toLowerCase();
      return tag === 'h1' || tag === 'h2' || tag === 'h3' || 
             tag === 'div' || tag === 'p' || tag === 'img' || 
             tag === 'a' || tag === 'hr' || tag === 'table';
    });
    if (bodyDirectChildren.length > 0) {
      contentContainer = doc.body;
    }
  }
  
  if (!contentContainer) {
    // Strategy 2: Find innermost td (our nested table format)
    const allTds = doc.querySelectorAll('td');
    if (allTds.length > 0) {
      let bestTd: Element | null = null;
      let maxBlockChildren = 0;
      allTds.forEach((td) => {
        const blockChildren = Array.from(td.children).filter((child) => {
          const tag = child.tagName.toLowerCase();
          return tag === 'h1' || tag === 'h2' || tag === 'h3' || 
                 tag === 'div' || tag === 'img' || tag === 'a' || 
                 tag === 'hr' || tag === 'table';
        });
        const hasContent = blockChildren.some((child) => {
          const text = child.textContent?.trim() || child.innerHTML.trim();
          return text.length > 0;
        });
        if (blockChildren.length > maxBlockChildren && hasContent) {
          maxBlockChildren = blockChildren.length;
          bestTd = td;
        }
      });
      if (bestTd) {
        contentContainer = bestTd;
      }
    }
    
    // Strategy 3: Fallback to simpler selectors
    if (!contentContainer) {
      contentContainer = doc.querySelector('body table td td') ||
                         doc.querySelector('.email-container td') ||
                         doc.querySelector('.email-container') ||
                         doc.querySelector('body table td') ||
                         doc.querySelector('body > table') ||
                         doc.body;
    }
  }
  
  if (!contentContainer) {
    contentContainer = doc.body;
  }

  let children: Element[] = [];
  if (contentContainer.tagName === 'TD') {
    children = Array.from(contentContainer.children);
  } else if (contentContainer.tagName === 'TABLE') {
    // For tables, try to find the innermost td
    const innerTds = contentContainer.querySelectorAll('td');
    if (innerTds.length > 0) {
      // Get the td with the most children
      let bestTd: Element | null = null;
      let maxChildren = 0;
      innerTds.forEach((td) => {
        if (td.children.length > maxChildren) {
          maxChildren = td.children.length;
          bestTd = td;
        }
      });
      const tdToUse = bestTd || innerTds[0];
      if (tdToUse) {
        children = Array.from(tdToUse.children);
      }
    } else {
      children = Array.from(contentContainer.children);
    }
  } else {
    children = Array.from(contentContainer.children);
  }

  // If still no children, try parsing innerHTML directly
  if (children.length === 0 && contentContainer.innerHTML.trim()) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentContainer.innerHTML;
    children = Array.from(tempDiv.children);
  }

  children.forEach((child) => {
    const tagName = child.tagName.toLowerCase();
    
    if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
      blocks.push({
        id: `block-${Date.now()}-${order}`,
        type: "header",
        content: child.innerHTML,
        styles: {
          fontSize: window.getComputedStyle(child as Element).fontSize || "32px",
          color: window.getComputedStyle(child as Element).color || "#333333",
          textAlign: (() => {
            const align = (child as HTMLElement).style.textAlign;
            return (align === "left" || align === "center" || align === "right" || align === "justify") 
              ? align 
              : "center" as "left" | "center" | "right" | "justify";
          })(),
        },
        order: order++,
      });
    } else if (tagName === "img") {
      blocks.push({
        id: `block-${Date.now()}-${order}`,
        type: "image",
        content: "",
        styles: {
          imageUrl: (child as HTMLImageElement).src,
        },
        order: order++,
      });
    } else if (tagName === "a" && (child as HTMLElement).style.backgroundColor) {
      blocks.push({
        id: `block-${Date.now()}-${order}`,
        type: "button",
        content: "",
        styles: {
          buttonText: child.textContent || "Click Here",
          buttonUrl: (child as HTMLAnchorElement).href || "#",
          buttonColor: (child as HTMLElement).style.backgroundColor || "#2563eb",
        },
        order: order++,
      });
    } else if (tagName === "hr") {
      blocks.push({
        id: `block-${Date.now()}-${order}`,
        type: "divider",
        content: "",
        styles: {},
        order: order++,
      });
    } else if (tagName === "p") {
      // Paragraph tags should be converted to text blocks
      const innerText = child.textContent?.trim() || "";
      const innerHtml = child.innerHTML.trim();
      if (innerText || innerHtml) {
        blocks.push({
          id: `block-${Date.now()}-${order}`,
          type: "text",
          content: `<p>${innerHtml || innerText}</p>`,
          styles: {
            fontSize: (child as HTMLElement).style.fontSize || undefined,
            color: (child as HTMLElement).style.color || undefined,
            textAlign: (child as HTMLElement).style.textAlign as any || undefined,
            backgroundColor: (child as HTMLElement).style.backgroundColor || undefined,
            padding: (child as HTMLElement).style.padding || "20px",
          },
          order: order++,
        });
      }
    } else if (tagName === "div" || tagName === "span") {
      // Check if div contains block-level children (h1, h2, p, etc.) - if so, extract them separately
      const blockLevelChildren = Array.from(child.children).filter((c) => {
        const tag = c.tagName.toLowerCase();
        return tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'p' || 
               tag === 'div' || tag === 'img' || tag === 'a' || tag === 'hr' || tag === 'table';
      });
      
      // If div contains multiple block-level children, extract them as separate blocks
      // This handles Gemini's wrapper divs like <div><h1>...</h1><p>...</p></div>
      if (blockLevelChildren.length > 1) {
        blockLevelChildren.forEach((blockChild) => {
          const childTag = blockChild.tagName.toLowerCase();
          if (childTag === "h1" || childTag === "h2" || childTag === "h3") {
            blocks.push({
              id: `block-${Date.now()}-${order}`,
              type: "header",
              content: blockChild.innerHTML,
              styles: {
                fontSize: window.getComputedStyle(blockChild as Element).fontSize || "32px",
                color: window.getComputedStyle(blockChild as Element).color || "#333333",
                textAlign: (() => {
                  const align = (blockChild as HTMLElement).style.textAlign;
                  return (align === "left" || align === "center" || align === "right" || align === "justify") 
                    ? align 
                    : "center" as "left" | "center" | "right" | "justify";
                })(),
              },
              order: order++,
            });
          } else if (childTag === "p") {
            const innerText = blockChild.textContent?.trim() || "";
            const innerHtml = blockChild.innerHTML.trim();
            if (innerText || innerHtml) {
              blocks.push({
                id: `block-${Date.now()}-${order}`,
                type: "text",
                content: `<p>${innerHtml || innerText}</p>`,
                styles: {
                  fontSize: (blockChild as HTMLElement).style.fontSize || undefined,
                  color: (blockChild as HTMLElement).style.color || undefined,
                  textAlign: (blockChild as HTMLElement).style.textAlign as any || undefined,
                  backgroundColor: (blockChild as HTMLElement).style.backgroundColor || undefined,
                  padding: (blockChild as HTMLElement).style.padding || "20px",
                },
                order: order++,
              });
            }
          } else if (childTag === "div") {
            // Nested div - extract its content as text block
            const innerText = blockChild.textContent?.trim() || "";
            const innerHtml = blockChild.innerHTML.trim();
            if (innerText || innerHtml) {
              blocks.push({
                id: `block-${Date.now()}-${order}`,
                type: "text",
                content: innerHtml || `<p>${innerText}</p>`,
                styles: {
                  fontSize: (blockChild as HTMLElement).style.fontSize || undefined,
                  color: (blockChild as HTMLElement).style.color || undefined,
                  textAlign: (blockChild as HTMLElement).style.textAlign as any || undefined,
                  backgroundColor: (blockChild as HTMLElement).style.backgroundColor || undefined,
                  padding: (blockChild as HTMLElement).style.padding || undefined,
                },
                order: order++,
              });
            }
          }
        });
      } else {
        // Single block or text content - treat as text block
        const innerText = child.textContent?.trim() || "";
        const innerHtml = child.innerHTML.trim();
        const hasChildren = child.children.length > 0;
        
        const hasTextBlockStyles = (child as HTMLElement).style.fontSize || 
                                    (child as HTMLElement).style.padding ||
                                    (child as HTMLElement).style.lineHeight;
        
        if (innerText || innerHtml || hasChildren || hasTextBlockStyles) {
          const isEmptyWrapper = !innerText && (!innerHtml || innerHtml.trim().length === 0) && !hasChildren && !hasTextBlockStyles;
          if (!isEmptyWrapper) {
            blocks.push({
              id: `block-${Date.now()}-${order}`,
              type: "text",
              content: innerHtml || innerText || "<p>&nbsp;</p>",
              styles: {
                fontSize: (child as HTMLElement).style.fontSize || undefined,
                color: (child as HTMLElement).style.color || undefined,
                textAlign: (child as HTMLElement).style.textAlign as any || undefined,
                backgroundColor: (child as HTMLElement).style.backgroundColor || undefined,
                padding: (child as HTMLElement).style.padding || undefined,
              },
              order: order++,
            });
          }
        }
      }
    } else if (tagName === "table") {
      // Check if it's a columns block
      const rows = (child as HTMLTableElement).rows;
      if (rows.length > 0 && rows[0].cells.length === 2) {
        // It's a two-column layout
        const col1Cell = rows[0].cells[0];
        const col2Cell = rows[0].cells[1];
        
        const col1Content = col1Cell.innerHTML.trim();
        const col2Content = col2Cell.innerHTML.trim();
        
        // Determine column block types
        const col1HasImage = col1Cell.querySelector('img');
        const col2HasImage = col2Cell.querySelector('img');
        
        blocks.push({
          id: `block-${Date.now()}-${order}`,
          type: "columns",
          content: "",
          styles: {
            columnLayout: "50-50",
            padding: (child.parentElement as HTMLElement)?.style.padding || "20px",
            backgroundColor: (child.parentElement as HTMLElement)?.style.backgroundColor || "#ffffff",
          },
          children: [
            {
              id: `block-${Date.now()}-col1-${order}`,
              type: col1HasImage ? "image" : "text",
              content: col1HasImage ? "" : col1Content,
              styles: col1HasImage ? {
                imageUrl: (col1Cell.querySelector('img') as HTMLImageElement)?.src || "",
              } : {},
              order: 0,
            },
            {
              id: `block-${Date.now()}-col2-${order}`,
              type: col2HasImage ? "image" : "text",
              content: col2HasImage ? "" : col2Content,
              styles: col2HasImage ? {
                imageUrl: (col2Cell.querySelector('img') as HTMLImageElement)?.src || "",
              } : {},
              order: 1,
            },
          ],
          order: order++,
        });
      } else {
        // Regular table, convert to text
        blocks.push({
          id: `block-${Date.now()}-${order}`,
          type: "text",
          content: child.innerHTML,
          styles: {},
          order: order++,
        });
      }
    } else {
      // Fallback: convert any other element to text
      const innerText = child.textContent?.trim() || "";
      const innerHtml = child.innerHTML.trim();
      
      if (innerText || innerHtml) {
        blocks.push({
          id: `block-${Date.now()}-${order}`,
          type: "text",
          content: innerHtml,
          styles: {},
          order: order++,
        });
      }
    }
  });

  // If nothing matched (e.g. old editor format), keep content as one text block so we don't wipe it
  if (blocks.length === 0 && doc.body?.innerHTML?.trim()) {
    const bodyContent = doc.body.innerHTML.trim();
    if (bodyContent.length > 0) {
      blocks.push({
        id: `block-${Date.now()}-fallback`,
        type: "text",
        content: bodyContent,
        styles: {},
        order: 0,
      });
    }
  }

  return blocks;
}

function blocksToHtml(blocks: EmailBlock[]): string {
  // If no blocks, return empty content
  if (!blocks || blocks.length === 0) {
    return "";
  }

  const htmlParts: string[] = [];

  blocks.forEach((block) => {
    const styles = block.styles;
    let html = "";

    switch (block.type) {
      case "header":
        const headerContent = block.content && block.content.trim() ? block.content : "Header";
        html = `<h1 style="font-size: ${styles.fontSize || "32px"}; font-family: ${styles.fontFamily || "Arial, sans-serif"}; color: ${styles.color || "#333333"}; text-align: ${styles.textAlign || "center"}; padding: ${styles.padding || "32px 24px 24px 24px"}; background-color: ${styles.backgroundColor || "#ffffff"}; margin: 0;">${headerContent}</h1>`;
        break;
      case "text":
        const textContent = block.content && block.content.trim() ? block.content : "<p>Text content</p>";
        html = `<div style="font-size: ${styles.fontSize || "16px"}; font-family: ${styles.fontFamily || "Arial, sans-serif"}; color: ${styles.color || "#333333"}; text-align: ${styles.textAlign || "left"}; padding: ${styles.padding || "0 24px 24px 24px"}; background-color: ${styles.backgroundColor || "#ffffff"}; line-height: ${styles.lineHeight || "1.6"}; margin: 0;">${textContent}</div>`;
        break;
      case "image":
        if (styles.imageUrl) {
          const imageUrl = styles.imageUrl.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
          // Ensure URL is properly formatted and add email-friendly attributes
          const cleanUrl = imageUrl.trim();
          html = `<div style="padding: ${styles.padding || "0"}; background-color: ${styles.backgroundColor || "#ffffff"}; text-align: ${styles.imageAlign || "center"}; margin: 0;"><img src="${cleanUrl}" alt="" width="600" style="width: ${styles.imageWidth || "100%"}; max-width: 100%; height: auto; display: block; margin: 0; border: 0; outline: none; text-decoration: none;" /></div>`;
        }
        break;
      case "button":
        const buttonText = styles.buttonText || "Click Here";
        const buttonUrl = styles.buttonUrl || "#";
        html = `<div style="padding: ${styles.padding || "0 24px 24px 24px"}; background-color: ${styles.backgroundColor || "#ffffff"}; text-align: ${styles.textAlign || "center"}; margin: 0;"><a href="${buttonUrl.replace(/"/g, "&quot;").replace(/'/g, "&#39;")}" style="display: inline-block; background-color: ${styles.buttonColor || "#2563eb"}; color: ${styles.buttonTextColor || "#ffffff"}; padding: ${styles.buttonPadding || "12px 24px"}; border-radius: ${styles.buttonBorderRadius || "4px"}; text-decoration: none; font-size: ${styles.fontSize || "16px"}; font-family: ${styles.fontFamily || "Arial, sans-serif"}; font-weight: ${styles.fontWeight || "600"};">${buttonText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</a></div>`;
        break;
      case "divider":
        html = `<div style="padding: ${styles.padding || "20px"}; background-color: ${styles.backgroundColor || "#ffffff"}; margin: 0;"><hr style="border: none; border-top: ${styles.dividerHeight || "1px"} solid ${styles.dividerColor || "#e5e7eb"}; width: ${styles.dividerWidth || "100%"}; margin: 0;" /></div>`;
        break;
      case "spacer":
        html = `<div style="height: ${styles.spacerHeight || "40px"}; background-color: ${styles.backgroundColor || "#ffffff"};"></div>`;
        break;
      case "columns":
        const colLayout = styles.columnLayout || "50-50";
        const [colWidth1, colWidth2] = colLayout === "50-50" 
          ? ["50%", "50%"] 
          : colLayout === "33-67" 
          ? ["33.33%", "66.67%"] 
          : ["66.67%", "33.33%"];

        const renderColumnBlockHtml = (colBlock: EmailBlock | undefined) => {
          if (!colBlock) return "&nbsp;";
          
          if (colBlock.type === "image" && colBlock.styles.imageUrl) {
            const imageUrl = colBlock.styles.imageUrl.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
            return `<img src="${imageUrl}" alt="" style="width: 100%; max-width: 100%; height: auto; display: block;" />`;
          } else if (colBlock.type === "text") {
            return colBlock.content && colBlock.content.trim() ? colBlock.content : "<p>&nbsp;</p>";
          }
          return "&nbsp;";
        };

        const col1Content = renderColumnBlockHtml(block.children?.[0]);
        const col2Content = renderColumnBlockHtml(block.children?.[1]);

        html = `<div style="background-color: ${styles.backgroundColor || "#ffffff"}; padding: ${styles.padding || "20px"}; margin: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%;">
            <tr>
              <td width="${colWidth1}" style="padding: 10px; vertical-align: top;">
                ${col1Content}
              </td>
              <td width="${colWidth2}" style="padding: 10px; vertical-align: top;">
                ${col2Content}
              </td>
            </tr>
          </table>
        </div>`;
        break;
    }

    if (html && html.trim()) {
      htmlParts.push(html);
    }
  });

  const bodyContent = htmlParts.join("").trim();
  
  // If no content, return empty string (will be handled by send function)
  if (!bodyContent || bodyContent === "") {
    return "";
  }

  // Wrap in proper email HTML structure - simplified for better compatibility
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Newsletter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; width: 100%;">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 0;">
              ${bodyContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
