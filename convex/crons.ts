import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("daily SRS queue", "0 4 * * *", internal.srsEngine.populateQueues, {});

export default crons;
