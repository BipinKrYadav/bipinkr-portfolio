\# Production Release Runbook



Production public-site deployments must use an approved Admin release.



\## Required sequence



1\. Create a release in Admin.

2\. Validate the release.

3\. Review the release.

4\. Approve the release.

5\. Start publishing.

6\. Download the exact release snapshot.

7\. Record the snapshot SHA-256 shown by Admin.

8\. Build only with:



&#x20;  npm run release:build -- --snapshot release-N.snapshot.json --sha256 <SNAPSHOT\_SHA> --release N



9\. Record the generated deployment ZIP SHA-256 on the Admin release page.

10\. Upload the generated release ZIP contents manually to the public Hostinger site root.

11\. Verify the live site:



&#x20;  npm run release:verify-live -- --release N --sha256 <SNAPSHOT\_SHA>



12\. Only after live verification passes, mark the release Published in Admin.



\## Deployment safety



Do not deploy a plain `npm run build` output.



A normal Next.js build does not prove that the approved Admin release snapshot was used.



Before manual deployment, run:



npm run release:check-output -- --release N --sha256 <SNAPSHOT\_SHA>



This must pass before uploading `out/`.



\## Important



\- Never deploy `admin/out/` to the public site.

\- Never upload an old release ZIP.

\- Never change the release snapshot after recording its SHA-256.

\- Do not mark a release Published until live verification passes.

\- Deployment remains a manual Hostinger operation.

\- This workflow does not modify SSH, Cron, DNS, or Supabase credentials.

