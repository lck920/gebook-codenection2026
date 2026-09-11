import type { UIMessage } from "ai";
import type { AgentUIDataParts } from "@gebook/agent-ui-catalog";

/** Typed AI SDK message shared by transport, persistence, and page rendering. */
export type AgentUIMessage = UIMessage<unknown, AgentUIDataParts>;
