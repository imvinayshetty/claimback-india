import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const RETENTION_DAYS = 30;

export const Route = createFileRoute("/api/public/jobs/purge-files")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
        const { data: due, error } = await supabaseAdmin.from("claims").select("id")
          .lt("analyzed_at", cutoff).is("files_purged_at", null).limit(200);
        if (error) return Response.json({ error: "lookup failed" }, { status: 500 });
        let purged = 0;
        for (const c of due ?? []) {
          const { data: files } = await supabaseAdmin.from("claim_files").select("storage_path").eq("claim_id", c.id);
          if (files?.length) {
            const { error: rm } = await supabaseAdmin.storage.from("claim-docs").remove(files.map((f) => f.storage_path));
            if (rm) continue;
            await supabaseAdmin.from("claim_files").delete().eq("claim_id", c.id);
          }
          await supabaseAdmin.from("claims").update({ files_purged_at: new Date().toISOString() }).eq("id", c.id);
          purged++;
        }
        return Response.json({ purged });
      },
    },
  },
});
