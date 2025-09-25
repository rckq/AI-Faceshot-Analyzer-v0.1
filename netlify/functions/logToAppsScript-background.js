exports.handler = async function (event) {
  try {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (!appsScriptUrl) {
      console.log(
        "APPS_SCRIPT_URL is not configured. Skipping Apps Script logging."
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: false, reason: "APPS_SCRIPT_URL not set" }),
      };
    }

    const incoming = JSON.parse(event.body || "{}");
    const sheetPayload = {
      action: incoming.action || "complete",
      requestId: incoming.requestId || "",
      name: incoming.name || "",
      contact: incoming.contact || "",
      timestamp: incoming.timestamp || new Date().toLocaleString("ko-KR"),
      image: incoming.image || incoming.imageBase64 || "",
      consent: incoming.consent
        ? "Y"
        : incoming.consent === "N"
        ? "N"
        : incoming.consent || "N",
      clientId: incoming.clientId || "",
      visitorId: incoming.visitorId || "",
      ip: incoming.ip || "",
      ua: incoming.ua || "",
      lang: incoming.lang || "",
      referrer: incoming.referrer || "",
      figureScore: incoming.figureScore,
      backgroundScore: incoming.backgroundScore,
      vibeScore: incoming.vibeScore,
      figureCritique: incoming.figureCritique,
      backgroundCritique: incoming.backgroundCritique,
      vibeCritique: incoming.vibeCritique,
      finalCritique: incoming.finalCritique,
    };

    console.log(
      "[BG] Sending to Apps Script:",
      JSON.stringify(sheetPayload, null, 2)
    );

    const sheetResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sheetPayload),
    });

    const sheetResult = await sheetResponse.text();
    console.log("[BG] Apps Script response status:", sheetResponse.status);
    console.log("[BG] Apps Script response:", sheetResult);

    if (!sheetResponse.ok) {
      console.error(
        "[BG] Apps Script request failed:",
        sheetResponse.status,
        sheetResult
      );
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error("[BG] Sheet logging failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};
