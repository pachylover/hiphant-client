import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "content", "notice.md")
    const content = await fs.readFile(filePath, "utf-8")
    return new NextResponse(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch {
    return new NextResponse("", { status: 404 })
  }
}
