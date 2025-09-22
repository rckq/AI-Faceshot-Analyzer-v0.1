exports.handler = async function (event) {
  try {
    // *** FIX: 클라이언트로부터 prompt와 imageBase64를 모두 받습니다. ***
    const { prompt, imageBase64 } = JSON.parse(event.body);

    // 둘 중 하나라도 없으면 오류를 반환합니다.
    if (!prompt || !imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing prompt or imageBase64" }),
      };
    }

    // Netlify 환경 변수에서 안전하게 API 키를 가져옵니다.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "API key is not set in Netlify environment variables",
        }),
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64.split(",")[1],
              },
            },
          ],
        },
      ],
      // 안전 설정을 추가하여 차단 가능성을 낮춥니다.
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Gemini API의 응답을 그대로 클라이언트에 전달합니다.
    const result = await response.json();

    return {
      statusCode: response.status,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
