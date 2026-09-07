import { defineSchedule } from "eve/schedules";
import { refreshAndStore } from "../../lib/refresh-store.mjs";

// Daily at 08:00 UTC. Rejections propagate so the scheduler records failure.
export default defineSchedule({
  cron: "0 8 * * *",
  run: async () => { await refreshAndStore(); },
});
