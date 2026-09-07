# /public/documents

Place the resume PDF here.

1. Copy the PDF into this folder.
2. Set `NEXT_PUBLIC_RESUME_FILE` in `.env.local` to the exact filename
   (default: `bipin-kumar-resume.pdf`).
3. Rebuild.

The `/resume` page checks for the file at build time. When it is missing the
page renders a placeholder state; when it is present the inline preview and
the download button appear automatically.

Do not commit client campaign exports, XLSX files or anything containing
account IDs or lead-level data to this folder — it is served publicly.
