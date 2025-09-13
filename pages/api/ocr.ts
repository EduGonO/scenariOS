import type { NextApiRequest, NextApiResponse } from "next";
import pdf from "pdf-parse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { file } = req.body as { file?: string };
  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  try {
    const buffer = Buffer.from(file, "base64");
    const data = await pdf(buffer);
    res.status(200).json({ text: data.text });
  } catch (err) {
    console.error("OCR error", err);
    res.status(500).json({ error: "Failed to read PDF" });
  }
}

