import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getRequestUserId } from "@/lib/request-user";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const maxUploadBytes = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
    }

    if (file.size > maxUploadBytes) {
      return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: 1600, height: 900, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filename = `${userId}-${Date.now()}-${randomUUID()}.webp`;
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, optimized);

    return NextResponse.json({
      url: `/uploads/${filename}`,
      originalSize: file.size,
      optimizedSize: optimized.length,
      contentType: "image/webp"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image could not be uploaded." },
      { status: 500 }
    );
  }
}
