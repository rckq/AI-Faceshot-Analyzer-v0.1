exports.handler = async function (event) {
\ttry {
\t\tconst appsScriptUrl = process.env.APPS_SCRIPT_URL;
\t\tif (!appsScriptUrl) {
\t\t\tconsole.log("APPS_SCRIPT_URL is not configured. Skipping Apps Script logging.");
\t\t\treturn { statusCode: 200, body: JSON.stringify({ ok: false, reason: "APPS_SCRIPT_URL not set" }) };
\t\t}

\t\tconst incoming = JSON.parse(event.body || "{}");
\t\tconst sheetPayload = {
\t\t\taction: incoming.action || "complete",
\t\t\trequestId: incoming.requestId || "",
\t\t\tname: incoming.name || "",
\t\t\tcontact: incoming.contact || "",
\t\t\ttimestamp: incoming.timestamp || new Date().toLocaleString("ko-KR"),
\t\t\timage: incoming.image || incoming.imageBase64 || "",
\t\t\tconsent: incoming.consent ? "Y" : incoming.consent === "N" ? "N" : (incoming.consent || "N"),
\t\t\tclientId: incoming.clientId || "",
\t\t\tvisitorId: incoming.visitorId || "",
\t\t\tip: incoming.ip || "",
\t\t\tua: incoming.ua || "",
\t\t\tlang: incoming.lang || "",
\t\t\treferrer: incoming.referrer || "",
\t\t\tfigureScore: incoming.figureScore,
\t\t\tbackgroundScore: incoming.backgroundScore,
\t\t\tvibeScore: incoming.vibeScore,
\t\t\tfigureCritique: incoming.figureCritique,
\t\t\tbackgroundCritique: incoming.backgroundCritique,
\t\t\tvibeCritique: incoming.vibeCritique,
\t\t\tfinalCritique: incoming.finalCritique,
\t\t};

\t\tconsole.log("[BG] Sending to Apps Script:", JSON.stringify(sheetPayload, null, 2));

\t\tconst sheetResponse = await fetch(appsScriptUrl, {
\t\t\tmethod: "POST",
\t\t\theaders: { "Content-Type": "application/json" },
\t\t\tbody: JSON.stringify(sheetPayload),
\t\t});

\t\tconst sheetResult = await sheetResponse.text();
\t\tconsole.log("[BG] Apps Script response status:", sheetResponse.status);
\t\tconsole.log("[BG] Apps Script response:", sheetResult);

\t\tif (!sheetResponse.ok) {
\t\t\tconsole.error("[BG] Apps Script request failed:", sheetResponse.status, sheetResult);
\t\t}

\t\treturn { statusCode: 200, body: JSON.stringify({ ok: true }) };
\t} catch (error) {
\t\tconsole.error("[BG] Sheet logging failed:", error);
\t\treturn { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
\t}
};


