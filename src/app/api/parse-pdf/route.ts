import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Convert the File object to a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamically require pdf-parse to avoid Next.js build errors with canvas/DOMMatrix
    const pdfParse = (await import("pdf-parse")).default;

    // Parse the PDF
    const data = await pdfParse(buffer);

    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF. Please try copying and pasting the text instead." },
      { status: 500 }
    );
  }
}
