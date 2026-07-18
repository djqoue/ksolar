import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dbMigration = readFileSync(
  join(process.cwd(), "db/migrations/20260718064305_202607180003_quote_atomic_save.sql"),
  "utf8",
);
const supabaseMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260718064305_202607180003_quote_atomic_save.sql"),
  "utf8",
);
const normalizedSql = dbMigration.replace(/\s+/g, " ").toLowerCase();

describe("quote persistence permission boundary", () => {
  it("keeps the deploy and Supabase migration mirrors identical", () => {
    expect(dbMigration).toBe(supabaseMigration);
  });

  it("only permits the service role to execute the atomic quote RPC", () => {
    expect(normalizedSql).toContain("p_actor_user_id uuid");
    expect(normalizedSql).toContain("if auth.role() is distinct from 'service_role'");
    expect(normalizedSql).toMatch(
      /revoke all on function public\.save_quote_atomic\([^)]+\) from public, anon, authenticated;/,
    );
    expect(normalizedSql).toMatch(
      /grant execute on function public\.save_quote_atomic\([^)]+\) to service_role;/,
    );
    expect(normalizedSql).not.toMatch(
      /grant execute on function public\.save_quote_atomic\([^)]+\) to authenticated;/,
    );
  });

  it("removes direct authenticated writes from every persisted quote table", () => {
    for (const table of [
      "quote_projects",
      "quote_versions",
      "quote_inputs",
      "quote_outputs",
      "bom_snapshots",
      "finance_scenarios",
    ]) {
      expect(normalizedSql).toContain(
        `revoke insert, update, delete on public.${table} from authenticated;`,
      );
    }

    expect(normalizedSql).toContain(
      "pg_catalog.has_function_privilege('authenticated', function_signature, 'execute')",
    );
  });
});
