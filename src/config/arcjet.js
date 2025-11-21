import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";



const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: process.env.ARCJET_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        "CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    // Rate limit requests using a sliding window algorithm
    slidingWindow({
      mode: "LIVE", // Enforce the rate limit. Use "DRY_RUN" to log only
      interval: '2s', // Time window in seconds
      max: 5, // Max requests allowed within the time window

    }),
  ],
});

export default aj;