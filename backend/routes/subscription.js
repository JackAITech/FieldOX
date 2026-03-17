const express = require("express");
const router = express.Router();

// RevenueCat webhook secret — set in RevenueCat Dashboard → Project → Integrations → Webhooks
const RC_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || "";

/**
 * POST /api/subscription/webhook
 * RevenueCat posts events here when subscriptions change.
 * Configure this URL in: RevenueCat Dashboard → Project → Integrations → Webhooks
 *
 * Use this to update your own user database, send welcome emails, etc.
 */
router.post("/webhook", (req, res) => {
  // Validate webhook secret
  const authHeader = req.headers.authorization || "";
  if (RC_WEBHOOK_SECRET && authHeader !== RC_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const event = req.body;
  const type = event?.event?.type;
  const appUserId = event?.event?.app_user_id;
  const productId = event?.event?.product_id;
  const expiresAt = event?.event?.expiration_at_ms;

  console.log(`[RevenueCat] Event: ${type} | User: ${appUserId} | Product: ${productId}`);

  // Handle subscription lifecycle events
  switch (type) {
    case "INITIAL_PURCHASE":
      console.log(`New subscriber: ${appUserId} → ${productId}`);
      // TODO: Mark user as subscribed in your database
      // TODO: Send welcome email
      break;

    case "RENEWAL":
      console.log(`Renewed: ${appUserId} → expires ${new Date(expiresAt).toISOString()}`);
      break;

    case "CANCELLATION":
      console.log(`Cancelled: ${appUserId} — access until ${new Date(expiresAt).toISOString()}`);
      // TODO: Flag in database — user retains access until expiry
      break;

    case "EXPIRATION":
      console.log(`Expired: ${appUserId}`);
      // TODO: Remove pro access from user record
      break;

    case "BILLING_ISSUE":
      console.log(`Billing issue: ${appUserId}`);
      // TODO: Send payment failure email
      break;

    case "PRODUCT_CHANGE":
      console.log(`Plan changed: ${appUserId} → ${productId}`);
      break;

    default:
      console.log(`Unhandled event type: ${type}`);
  }

  // Always respond 200 quickly so RevenueCat doesn't retry
  res.status(200).json({ received: true });
});

/**
 * GET /api/subscription/plans
 * Returns plan info for display in the app (pricing, features).
 * This is a lightweight alternative to fetching from RevenueCat directly.
 */
router.get("/plans", (req, res) => {
  res.json({
    plans: [
      {
        id: "monthly",
        name: "Monthly",
        price: 9.99,
        currency: "USD",
        introPrice: 0,
        introPeriod: "7 days",
        billingPeriod: "month",
        description: "7-day free trial, then $9.99/month. Cancel anytime.",
        savings: null,
      },
      {
        id: "annual",
        name: "Annual",
        price: 79.00,
        currency: "USD",
        introPrice: null,
        introPeriod: null,
        billingPeriod: "year",
        perMonth: 6.58,
        description: "$79.00/year — less than $6.58/month.",
        savings: "Save $40.88 vs monthly",
        badge: "BEST VALUE",
      },
    ],
    features: [
      "Unlimited field registry",
      "EPA-compliant spray records",
      "Season analytics & cost reports",
      "Soil moisture tracking",
      "Crop planting & harvest calendars",
      "Live weather & USDA zone detection",
    ],
  });
});

module.exports = router;
