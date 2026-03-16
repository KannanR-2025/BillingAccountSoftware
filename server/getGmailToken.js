/**
 * Run once: node getGmailToken.js
 * Opens browser for Google auth, prints your refresh token.
 */
const { google } = require("googleapis");
const http = require("http");
const url = require("url");

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "YOUR_CLIENT_ID_HERE";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "YOUR_CLIENT_SECRET_HERE";
const REDIRECT_URI = "http://localhost:3001/callback";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
});

console.log("\nOpen this URL in your browser:\n");
console.log(authUrl);
console.log("\nWaiting for callback on http://localhost:3001/callback ...\n");

const server = http.createServer(async (req, res) => {
  const { query } = url.parse(req.url, true);
  if (!query.code) { res.end("No code received."); return; }

  try {
    const { tokens } = await oauth2Client.getToken(query.code);
    res.end("<h2>Success! Check your terminal for the refresh token.</h2>");
    console.log("\n=== REFRESH TOKEN ===");
    console.log(tokens.refresh_token);
    console.log("====================\n");
  } catch (err) {
    res.end("Error: " + err.message);
    console.error("Error:", err.message);
  }
  server.close();
});

server.listen(3001, () => console.log("Listening on port 3001..."));
