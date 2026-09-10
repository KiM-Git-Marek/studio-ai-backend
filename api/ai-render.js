export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Dozwolona jest tylko metoda POST"
    });
  }

  try {
    const {
      imageDataUrl,
      prompt,
      size = "1536x1024"
    } = req.body || {};

    if (!imageDataUrl) {
      return res.status(400).json({
        error: "Brak obrazu wejściowego imageDataUrl"
      });
    }

    if (!prompt) {
      return res.status(400).json({
        error: "Brak promptu"
      });
    }

    const match = imageDataUrl.match(
      /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/
    );

    if (!match) {
      return res.status(400).json({
        error: "Niepoprawny format obrazu wejściowego"
      });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const imageBuffer = Buffer.from(base64Data, "base64");

    const imageBlob = new Blob(
      [imageBuffer],
      { type: mimeType }
    );

    const formData = new FormData();

    formData.append("model", "gpt-image-2");

    formData.append(
      "image",
      imageBlob,
      "scene.jpg"
    );

    formData.append(
      "prompt",
      `
Photorealistically enhance the supplied 3D scene.

CRITICAL:
Preserve the original camera position, perspective,
geometry, object proportions, object positions
and composition as accurately as possible.

Do not move, resize, rotate, add or remove objects.

Only improve:
- photorealistic materials
- physically believable lighting
- realistic reflections
- contact shadows
- global illumination appearance
- surface detail
- glass realism
- wood realism
- wall realism
- photographic exposure

User instructions:
${prompt}
      `
    );

    formData.append("size", size);
    formData.append("quality", "high");
    formData.append("output_format", "png");

    const response = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: formData
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(result);

      return res.status(response.status).json({
        error: "Błąd API OpenAI",
        details: result
      });
    }

    const imageBase64 =
      result?.data?.[0]?.b64_json;

    if (!imageBase64) {
      return res.status(500).json({
        error: "OpenAI nie zwrócił obrazu",
        raw: result
      });
    }

    return res.status(200).json({
      b64_json: imageBase64
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error:
        error?.message ||
        "Nieznany błąd backendu"
    });
  }
}
