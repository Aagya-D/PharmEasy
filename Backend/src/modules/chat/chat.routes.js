/**
 * Chat Routes
 * GET /api/chat/:sosRequestId - Protected chat history endpoint
 */

import { Router } from "express";
import { getConversations, getChatHistory } from "./chat.controller.js";
import { authenticate } from "../../middlewares/auth.js";

const router = Router();

// GET /api/chat/conversations — list active chat conversations (pharmacy)
router.get("/conversations", authenticate(), getConversations);

// GET /api/chat/:sosRequestId — retrieve chat history (protected)
router.get("/:sosRequestId", authenticate(), getChatHistory);

export default router;
