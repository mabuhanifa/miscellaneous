const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhook.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validationMiddleware = require("../middleware/validation.middleware");
const Joi = require("joi");

// Validation schemas
const registerWebhookSchema = Joi.object({
  event: Joi.string()
    .required()
    .valid(
      "order.created",
      "order.updated",
      "order.cancelled",
      "order.shipped",
      "order.delivered",
      "payment.completed",
      "payment.failed",
      "payment.refunded",
      "product.created",
      "product.updated",
      "product.deleted",
      "inventory.low_stock",
      "customer.registered",
      "customer.updated"
    ),
  url: Joi.string().uri().required(),
  secret: Joi.string().min(16).optional(),
  options: Joi.object({
    retryAttempts: Joi.number().integer().min(1).max(10).default(3),
    timeout: Joi.number().integer().min(1000).max(30000).default(10000),
    headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  }).optional(),
});

const updateWebhookSchema = Joi.object({
  url: Joi.string().uri().optional(),
  active: Joi.boolean().optional(),
  retryAttempts: Joi.number().integer().min(1).max(10).optional(),
  timeout: Joi.number().integer().min(1000).max(30000).optional(),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

const triggerWebhookSchema = Joi.object({
  payload: Joi.object().required(),
  metadata: Joi.object().optional(),
});

const importWebhooksSchema = Joi.object({
  webhooks: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        event: Joi.string().required(),
        url: Joi.string().uri().required(),
        active: Joi.boolean().default(true),
        headers: Joi.object().optional(),
        retryAttempts: Joi.number().integer().min(1).max(10).default(3),
        timeout: Joi.number().integer().min(1000).max(30000).default(10000),
      })
    )
    .required(),
  secrets: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

// Public webhook endpoints (no authentication required)
// These are for receiving webhooks from external services
router.post("/incoming/:provider", webhookController.handleIncomingWebhook);

// Protected webhook management routes
router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize(["admin", "merchant"]));

// Webhook CRUD operations
router.post(
  "/",
  validationMiddleware.validateSchema(registerWebhookSchema),
  webhookController.registerWebhook
);
router.get("/", webhookController.getAllWebhooks);
router.get("/:webhookId", webhookController.getWebhook);
router.put(
  "/:webhookId",
  validationMiddleware.validateSchema(updateWebhookSchema),
  webhookController.updateWebhook
);
router.delete("/:webhookId", webhookController.deleteWebhook);

// Webhook management operations
router.post("/:webhookId/test", webhookController.testWebhook);
router.get("/:webhookId/stats", webhookController.getWebhookStats);
router.post("/:webhookId/activate", webhookController.activateWebhook);
router.post("/:webhookId/deactivate", webhookController.deactivateWebhook);

// Manual webhook triggering (for testing)
router.post(
  "/trigger/:event",
  validationMiddleware.validateSchema(triggerWebhookSchema),
  webhookController.triggerWebhook
);

// Import/Export operations (admin only)
router.use(authMiddleware.authorize(["admin"]));
router.get("/export/all", webhookController.exportWebhooks);
router.post(
  "/import/all",
  validationMiddleware.validateSchema(importWebhooksSchema),
  webhookController.importWebhooks
);

module.exports = router;
