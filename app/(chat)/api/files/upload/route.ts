import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

import { auth } from "@/app/(auth)/auth";

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size should be less than 5MB",
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ["image/jpeg", "image/png"].includes(file.type), {
      message: "File type should be JPEG or PNG",
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Generate safe filename — never use user-supplied name directly
    const originalName = (formData.get("file") as File).name;
    const ext = originalName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const safeName = `${crypto.randomUUID()}.${ext}`;
    const fileBuffer = await file.arrayBuffer();

    try {
      // Store files locally in public/uploads directory
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, safeName);
      await writeFile(filePath, Buffer.from(fileBuffer));
      
      // Return public URL
      const publicUrl = `/uploads/${safeName}`;
      return NextResponse.json({ 
        url: publicUrl,
        pathname: publicUrl,
        downloadUrl: publicUrl 
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
