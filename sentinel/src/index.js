// Point d'entrée du Worker Sentinel : cron toutes les 15 minutes + GET /sante.
import { passage } from "../lib/passage.mjs";
import { repondre } from "../lib/sante.mjs";

export default {
  // Cron : un passage ; une erreur imprévue est journalisée sans détail.
  scheduled(evt, env, ctx) {
    ctx.waitUntil(passage(env).catch(() => { console.error("Sentinel : erreur imprévue pendant le passage."); }));
  },
  fetch(request, env, ctx) {
    return repondre(request, env);
  },
};
