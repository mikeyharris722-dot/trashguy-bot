const tmi = require("tmi.js");
const fetch = require("node-fetch");

const TWITCH_USERNAME = process.env.TWITCH_USERNAME;
const TWITCH_OAUTH_TOKEN = process.env.TWITCH_OAUTH_TOKEN;
const CHANNEL_NAME = process.env.CHANNEL_NAME || "trashguy__";
const API_BASE = (process.env.API_URL || "https://trashguy.me").replace(/\/$/, "");

const KEYWORD = "trash";

console.log("Bot starting...");
console.log("CHANNEL_NAME:", CHANNEL_NAME);
console.log("API_BASE:", API_BASE);
console.log("CHECK URL:", `${API_BASE}/api/chat-giveaway`);
console.log("ENTER URL:", `${API_BASE}/api/chat-giveaway/enter`);

if (!TWITCH_USERNAME || !TWITCH_OAUTH_TOKEN) {
  console.error("Missing TWITCH_USERNAME or TWITCH_OAUTH_TOKEN");
  process.exit(1);
}

const client = new tmi.Client({
  options: { debug: false },
  identity: {
    username: TWITCH_USERNAME,
    password: TWITCH_OAUTH_TOKEN,
  },
  channels: [CHANNEL_NAME],
});

async function checkGiveawayState() {
  try {
    const res = await fetch(`${API_BASE}/api/chat-giveaway`, {
      method: "GET",
      headers: { "User-Agent": "trashguy-bot" },
    });

    const text = await res.text();

    if (!res.ok) {
      console.log("Giveaway state bad response:", res.status, text);
      return null;
    }

    return JSON.parse(text);
  } catch (err) {
    console.log("Failed to check giveaway state:", err.message);
    return null;
  }
}

async function enterGiveaway(username, displayName) {
  try {
    const res = await fetch(`${API_BASE}/api/chat-giveaway/enter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "trashguy-bot",
      },
      body: JSON.stringify({
        username,
        display_name: displayName || username,
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      console.log("Entry bad response:", res.status, text);
      return;
    }

    console.log("Entry response:", text);
  } catch (err) {
    console.log("Entry failed:", err.message);
  }
}

client.on("message", async (channel, tags, message, self) => {
  if (self) return;

  const msg = String(message || "").trim().toLowerCase();
  if (msg !== KEYWORD) return;

  const username = String(tags.username || "").toLowerCase();
  const displayName = tags["display-name"] || username;

  console.log(`${username} typed ${KEYWORD}`);

  const state = await checkGiveawayState();

  if (!state?.ok || state?.giveaway?.status !== "live") {
    console.log("No live giveaway.");
    return;
  }

  await enterGiveaway(username, displayName);
});

client
  .connect()
  .then(() => {
    console.log(`Listening for "${KEYWORD}" in ${CHANNEL_NAME} chat...`);
  })
  .catch((err) => {
    console.error("Twitch connect failed:", err.message);
  });
