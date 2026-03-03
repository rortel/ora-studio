export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return json({ error: "Aucun fichier fourni" }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  let text = "";

  try {
    if (ext === "txt" || ext === "md") {
      // Plain text — read directly
      text = buffer.toString("utf-8");

    } else if (ext === "pdf") {
      // PDF — use pdf-parse (avoids Next.js test file issue by loading lib directly)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js");
      const data = await pdfParse(buffer);
      text = data.text;

    } else if (ext === "docx") {
      // DOCX — ZIP containing word/document.xml with <w:t> nodes
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JSZip = require("jszip");
      const zip = await JSZip.loadAsync(buffer);
      const docXmlFile = zip.file("word/document.xml");
      if (!docXmlFile) throw new Error("Structure DOCX invalide");
      const xml: string = await docXmlFile.async("string");
      text = xml
        .replace(/<w:p[^/]?>/gi, "\n")       // paragraph breaks
        .replace(/<w:t[^>]*>([^<]*)<\/w:t>/gi, "$1 ")
        .replace(/<[^>]+>/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    } else if (ext === "pptx") {
      // PPTX — ZIP containing ppt/slides/slide*.xml with <a:t> nodes
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JSZip = require("jszip");
      const zip = await JSZip.loadAsync(buffer);

      const slideKeys = Object.keys(zip.files)
        .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)/)?.[1] ?? "0");
          const nb = parseInt(b.match(/slide(\d+)/)?.[1] ?? "0");
          return na - nb;
        });

      const parts: string[] = [];
      for (const key of slideKeys) {
        const xml: string = await zip.files[key].async("string");
        const slideText = xml
          .replace(/<a:t[^>]*>([^<]*)<\/a:t>/gi, "$1 ")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (slideText) parts.push(slideText);
      }
      text = parts.join("\n\n--- Diapositive ---\n\n");

    } else if (ext === "ppt") {
      return json({ error: "Format .ppt (ancien) non supporté. Veuillez convertir en .pptx" }, 400);

    } else if (ext === "doc") {
      return json({ error: "Format .doc (ancien) non supporté. Veuillez convertir en .docx" }, 400);

    } else {
      return json({ error: `Format .${ext} non supporté. Formats acceptés : PDF, DOCX, PPTX, TXT, MD` }, 400);
    }
  } catch (err) {
    return json({ error: `Erreur de lecture du fichier : ${String(err)}` }, 500);
  }

  const cleaned = text.replace(/\r/g, "").replace(/\n{4,}/g, "\n\n\n").trim();
  if (!cleaned) {
    return json({ error: "Aucun texte trouvé dans le document" }, 400);
  }

  return json({ text: cleaned.slice(0, 20000), filename, char_count: cleaned.length });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
