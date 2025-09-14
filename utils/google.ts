import { google } from "googleapis";
import PDFDocument from "pdfkit";
import { decodeHtmlEntities } from "./text";

const SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

function getAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Google service account credentials missing");
  }
  return new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: SCOPES });
}

export async function createGoogleDoc(title: string, body: string, emails: string[]): Promise<string> {
  const auth = getAuth();
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });
  const doc = await docs.documents.create({ requestBody: { title } });
  const documentId = doc.data.documentId!;
  if (body) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: body,
            },
          },
        ],
      },
    });
  }
  for (const email of emails) {
    await drive.permissions.create({
      fileId: documentId,
      requestBody: { type: "user", role: "writer", emailAddress: email },
      sendNotificationEmail: true,
    });
  }
  return `https://docs.google.com/document/d/${documentId}/edit`;
}

export async function createGoogleSheet(title: string, rows: string[][], emails: string[]): Promise<string> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });
  const sheet = await sheets.spreadsheets.create({ requestBody: { properties: { title } } });
  const spreadsheetId = sheet.data.spreadsheetId!;
  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }
  for (const email of emails) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { type: "user", role: "writer", emailAddress: email },
      sendNotificationEmail: true,
    });
  }
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

export async function createPdfCallSheet(title: string, text: string, emails: string[]): Promise<string> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  doc.on("data", (b) => chunks.push(b));
  const clean = decodeHtmlEntities(text);
  doc.font("Courier").fontSize(12).text(clean, { lineGap: 4 });
  doc.end();
  const buffer: Buffer = await new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  const res = await drive.files.create({
    requestBody: { name: `${title}.pdf`, mimeType: "application/pdf" },
    media: { mimeType: "application/pdf", body: buffer },
  });
  const fileId = res.data.id!;
  for (const email of emails) {
    await drive.permissions.create({
      fileId,
      requestBody: { type: "user", role: "writer", emailAddress: email },
      sendNotificationEmail: true,
    });
  }
  return `https://drive.google.com/file/d/${fileId}/view`;
}
