// Cloudflare Worker + KV
// Bind a KV namespace to this Worker with variable name: ANALYTICS
// Add a Worker environment variable: ADMIN_TOKEN
//
// Endpoints:
// POST /api/event     public event ingestion
// GET  /api/admin     protected dashboard data
// OPTIONS            CORS preflight

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type":"application/json", ...corsHeaders}
  });
}

function keyFor(sessionId){
  return "session:" + sessionId;
}

function isValidId(id){
  return typeof id === "string" && /^[a-zA-Z0-9_-]{10,100}$/.test(id);
}

async function readSession(id){
  const raw = await ANALYTICS.get(keyFor(id));
  return raw ? JSON.parse(raw) : null;
}

export default {
  async fetch(request, env){
    if(request.method === "OPTIONS"){
      return new Response(null,{headers:corsHeaders});
    }

    const url = new URL(request.url);

    if(url.pathname === "/api/event" && request.method === "POST"){
      let body;
      try { body = await request.json(); }
      catch { return json({error:"invalid_json"},400); }

      const {sessionId,event,data={},page="love-quiz"} = body || {};
      if(!isValidId(sessionId)) return json({error:"invalid_session"},400);

      const allowedEvents = ["page_view","answer","completed"];
      if(!allowedEvents.includes(event)) return json({error:"invalid_event"},400);

      let session = await readSession(sessionId);
      const now = new Date().toISOString();

      if(!session){
        session = {
          sessionId,
          firstSeen: now,
          lastSeen: now,
          page,
          viewed: false,
          completed: false,
          answers: []
        };
      }

      session.lastSeen = now;
      session.viewed = true;

      if(event === "answer"){
        const q = Number(data.question);
        const option = Number(data.option);
        if(Number.isInteger(q) && Number.isInteger(option) &&
           q >= 1 && q <= 50 && option >= 1 && option <= 20){
          const existing = session.answers.find(a => a.question === q);
          const answer = {
            question:q,
            questionText:String(data.questionText || "").slice(0,500),
            option,
            optionText:String(data.optionText || "").slice(0,500),
            at:now
          };
          if(existing) Object.assign(existing,answer);
          else session.answers.push(answer);
        }
      }

      if(event === "completed") session.completed = true;

      // Keep only reasonable data size.
      session.answers = session.answers.slice(0,50);

      await ANALYTICS.put(keyFor(sessionId), JSON.stringify(session));
      return json({ok:true});
    }

    if(url.pathname === "/api/admin" && request.method === "GET"){
      const auth = request.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if(!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN){
        return json({error:"unauthorized"},401);
      }

      const listed = await ANALYTICS.list({prefix:"session:", limit:1000});
      const sessions = [];

      for(const item of listed.keys){
        const raw = await ANALYTICS.get(item.name);
        if(raw){
          try { sessions.push(JSON.parse(raw)); } catch {}
        }
      }

      sessions.sort((a,b)=>String(b.lastSeen).localeCompare(String(a.lastSeen)));

      return json({
        ok:true,
        count:sessions.length,
        sessions
      });
    }

    return json({error:"not_found"},404);
  }
};
