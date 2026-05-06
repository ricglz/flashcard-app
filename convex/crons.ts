import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("hourly SRS queue", "0 * * * *", internal.srsEngine.populateQueues, {});

export default crons;
