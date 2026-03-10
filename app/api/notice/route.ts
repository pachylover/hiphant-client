import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface NoticeMeta {
  id: string
  date: string
  title: string
  filename: string
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const frontmatter: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
    frontmatter[key] = value
  }

  return { frontmatter, body: match[2] }
}

// GET /api/notice - 공지사항 목록 반환
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("file")

  const noticesDir = path.join(process.cwd(), "content", "notices")

  try {
    // 특정 파일 요청인 경우
    if (filename) {
      const filePath = path.join(noticesDir, filename)
      const content = await fs.readFile(filePath, "utf-8")
      return new NextResponse(content, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    // 목록 요청인 경우
    const files = await fs.readdir(noticesDir)
    const mdFiles = files.filter((f) => f.endsWith(".md"))

    const notices: NoticeMeta[] = []

    for (const file of mdFiles) {
      const filePath = path.join(noticesDir, file)
      const content = await fs.readFile(filePath, "utf-8")
      const { frontmatter } = parseFrontmatter(content)

      notices.push({
        id: file.replace(".md", ""),
        date: frontmatter.date || "",
        title: frontmatter.title || "제목 없음",
        filename: file,
      })
    }

    // 날짜 기준 최신순 정렬
    notices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(notices)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
