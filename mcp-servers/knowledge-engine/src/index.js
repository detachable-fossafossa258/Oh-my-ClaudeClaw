#!/usr/bin/env node

/**
 * index.js — OpenClaw-CC Knowledge Engine MCP Server
 *
 * Provides knowledge graph, similarity search, refinement, and archival tools.
 * Shares the same SQLite database as memory-manager (WAL concurrent access).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  handleMemoryLink,
  handleMemoryGraph,
  handleMemorySimilar,
  handleMemoryRefine,
  handleMemoryArchive,
  handleReindexTrigrams,
} from "./tools.js";

// ─── MCP Server Instance ────────────────────────────────────

const server = new Server(
  { name: "openclaw-cc-knowledge-engine", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

// ─── ListTools: 6 tool definitions ──────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "memory_link",
      description: "Manages relationships between memories (knowledge graph). Create, delete, or list links with typed relations (related, derived, supersedes, blocks, contradicts, refines).",
      inputSchema: {
        type: "object",
        properties: {
          source_id: { type: "integer", description: "Source memory ID" },
          target_id: { type: "integer", description: "Target memory ID" },
          relation: {
            type: "string",
            enum: ["related", "derived", "supersedes", "blocks", "contradicts", "refines"],
            description: "Relationship type"
          },
          weight: { type: "number", minimum: 0, maximum: 1, description: "Link strength (0.0-1.0, default 1.0)" },
          action: {
            type: "string",
            enum: ["create", "delete", "list"],
            description: "Action to perform (default: create)"
          }
        }
      }
    },
    {
      name: "memory_graph",
      description: "Traverses the knowledge graph from a starting memory node using BFS. Returns connected nodes and edges up to the specified depth.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Starting memory ID" },
          depth: { type: "integer", minimum: 1, maximum: 4, description: "Traversal depth (default 2, max 4)" },
          relations: {
            type: "array",
            items: { type: "string" },
            description: "Filter by relation types (optional, null = all)"
          }
        },
        required: ["id"]
      }
    },
    {
      name: "memory_similar",
      description: "Finds memories similar to a given memory or text using trigram-based similarity search. No external API required — runs entirely in SQLite.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Find memories similar to this memory ID" },
          text: { type: "string", description: "Find memories similar to this text" },
          threshold: { type: "number", minimum: 0, maximum: 1, description: "Similarity threshold (0.0-1.0, default 0.3)" },
          limit: { type: "integer", minimum: 1, maximum: 20, description: "Maximum results (default 5)" }
        }
      }
    },
    {
      name: "memory_refine",
      description: "Triggers the memory refinement pipeline. Modes: normalize (rewrite to expert-level), consolidate (find and merge duplicates), upgrade (promote episodic→working→longterm).",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Memory ID to refine" },
          mode: {
            type: "string",
            enum: ["normalize", "consolidate", "upgrade"],
            description: "Refinement mode"
          }
        },
        required: ["id", "mode"]
      }
    },
    {
      name: "memory_archive",
      description: "Archives stale memories that haven't been accessed recently. Targets memories older than N days with importance < 7 and not in longterm layer. Use dry_run to preview.",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", description: "Archive only this category (optional)" },
          older_than: { type: "integer", description: "Archive memories older than N days (default 30)" },
          dry_run: { type: "boolean", description: "Preview without archiving (default false)" }
        }
      }
    },
    {
      name: "memory_reindex_trigrams",
      description: "Rebuilds the trigram similarity index for all memories. Run this after bulk imports or if similarity search returns unexpected results.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    }
  ]
}));

// ─── CallTool: Tool execution router ────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "memory_link":              return handleMemoryLink(args);
      case "memory_graph":             return handleMemoryGraph(args);
      case "memory_similar":           return handleMemorySimilar(args);
      case "memory_refine":            return handleMemoryRefine(args);
      case "memory_archive":           return handleMemoryArchive(args);
      case "memory_reindex_trigrams":   return handleReindexTrigrams(args);
      default:
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Unknown tool: ${name}`, code: "UNKNOWN_TOOL" }) }],
          isError: true
        };
    }
  } catch (error) {
    console.error(`[knowledge-engine] Unhandled error in ${name}: ${error.message}`);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ success: false, error: error.message, code: "INTERNAL_ERROR" })
      }],
      isError: true
    };
  }
});

// ─── Server Start ───────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[knowledge-engine] OpenClaw-CC Knowledge Engine MCP Server running");
}

main().catch((e) => {
  console.error(`[knowledge-engine] Fatal: ${e.message}`);
  process.exit(1);
});
