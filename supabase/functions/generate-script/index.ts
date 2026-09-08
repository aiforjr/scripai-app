// Supabase Edge Function: generate-script
//
// Generates (or returns the already-generated) ~1-minute AI script for the
// calling user's given day, via OpenRouter (openai/gpt-4o-mini). Runs with the
// CALLER'S OWN JWT forwarded through Postgres RLS — no service-role key is
// used, so the insert is naturally scoped to `auth.uid() = user_id` by the
// `daily_scripts` RLS policy in 0001_init.sql.
//
// Deploy: supabase functions deploy generate-script
// Secret: supabase secrets set OPENROUTER_API_KEY=sk-or-...

import { createClient } from 'jsr:@supabase/supabase-js@2';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  day?: string; // 'YYYY-MM-DD', defaults to today (server clock — client should pass its own local day)
  topic_title?: string; // optional: force a specific topic (e.g. "New script" regenerate with a chosen topic chip)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

    const body: RequestBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const day = body.day ?? new Date().toISOString().slice(0, 10);

    // Idempotent: if today's script already exists and no explicit regeneration
    // topic was requested, just return it (handles app re-opens / retries).
    if (!body.topic_title) {
      const { data: existing } = await supabase
        .from('daily_scripts')
        .select('*')
        .eq('user_id', user.id)
        .eq('day', day)
        .maybeSingle();
      if (existing) {
        return jsonResponse({ script: existing });
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, topic_preferences, age_bracket, camera_fear_situation')
      .eq('id', user.id)
      .maybeSingle();

    const { data: usedTopicIds } = await supabase
      .from('daily_scripts')
      .select('topic_id')
      .eq('user_id', user.id);
    const excludeIds = (usedTopicIds ?? []).map((r) => r.topic_id).filter(Boolean);

    let topic: { id: string | null; title: string };
    if (body.topic_title) {
      // The client sends a CATEGORY here (the "Money"/"Health"/… chips), not a
      // finished title. Resolve it to a real prompt-style topic in that category
      // so every script gets a proper title — storing the bare chip word made
      // the home card read "Health" instead of something like "Talk about how
      // you think about money." A title the user chose explicitly (i.e. one that
      // isn't a known category) is still honoured verbatim.
      const requested = body.topic_title;
      const { data: byCategory } = await supabase
        .from('topics')
        .select('id, title')
        .eq('active', true)
        .ilike('category', `%${requested}%`);

      const fresh = (byCategory ?? []).filter((t) => !excludeIds.includes(t.id));
      const categoryPool = fresh.length > 0 ? fresh : (byCategory ?? []);
      const pickedForCategory = categoryPool[Math.floor(Math.random() * categoryPool.length)];

      topic = pickedForCategory
        ? { id: pickedForCategory.id, title: pickedForCategory.title }
        : // No topic in that category — fall back to generating a title for the
          // requested subject rather than using the raw chip word as the title.
          { id: null, title: await generateTopicTitle(requested) };
    } else {
      let query = supabase.from('topics').select('id, title').eq('active', true);
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      const { data: candidates } = await query;
      const pool =
        candidates && candidates.length > 0
          ? candidates
          : ((await supabase.from('topics').select('id, title')).data ?? []);
      const picked = pool[Math.floor(Math.random() * pool.length)];
      topic = picked
        ? { id: picked.id, title: picked.title }
        : { id: null, title: 'Talk about your day.' };
    }

    const scriptText = await generateScriptText({
      topicTitle: topic.title,
      fullName: profile?.full_name ?? undefined,
      topicPreferences: profile?.topic_preferences ?? undefined,
      cameraFearSituation: profile?.camera_fear_situation ?? undefined,
    });

    const { data: inserted, error: insertError } = await supabase
      .from('daily_scripts')
      .upsert(
        {
          user_id: user.id,
          day,
          topic_id: topic.id,
          topic_title: topic.title,
          script_text: scriptText,
          model: 'openai/gpt-4o-mini',
        },
        { onConflict: 'user_id,day' },
      )
      .select('*')
      .single();

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({ script: inserted });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

/**
 * Writes a short prompt-style title for a subject, in the voice of the seeded
 * topics ("Talk about how you think about money."). Used when a requested
 * category has no seeded topic, so the script still gets a real title instead
 * of the bare subject word.
 */
async function generateTopicTitle(subject: string): Promise<string> {
  const fallback = `Talk about ${subject.toLowerCase()}.`;
  if (!OPENROUTER_API_KEY) return fallback;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You write a single short speaking prompt for a camera-confidence app. ' +
              'One sentence, imperative or question, under 60 characters, ending with a period or question mark. ' +
              'Examples: "Explain your job to a curious ten-year-old." / "Talk about a habit that changed your life." ' +
              'Reply with the prompt only — no quotes, no preamble.',
          },
          { role: 'user', content: `Subject: ${subject}` },
        ],
        max_tokens: 40,
        temperature: 0.9,
      }),
    });
    if (!response.ok) return fallback;
    const json = await response.json();
    const text: string | undefined = json?.choices?.[0]?.message?.content
      ?.trim()
      .replace(/^["']|["']$/g, '');
    return text && text.length > 0 ? text : fallback;
  } catch {
    // A title is never worth failing the whole request over.
    return fallback;
  }
}

async function generateScriptText(input: {
  topicTitle: string;
  fullName?: string;
  topicPreferences?: string[];
  cameraFearSituation?: string;
}): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    // Local/dev fallback so the loop is testable before a key is provisioned.
    return `${input.topicTitle} Here's a simple way to think about it: start with the one thing that matters most, say it plainly, then back it up with a single real example. Keep your sentences short. Look at the lens like it's a friend leaning in to listen, not a room full of strangers. Finish with the one takeaway you want to stick.`;
  }

  const system = [
    'You write short, natural, spoken-word scripts for a camera-confidence practice app.',
    'The script must read aloud in close to 60 seconds (roughly 130-150 words), in first person,',
    'conversational, no headings or bullet points, no stage directions, just the words to say.',
    input.fullName
      ? `Address the speaker as ${input.fullName} in spirit (not literally naming them in the script).`
      : '',
    input.cameraFearSituation
      ? `They get camera-shy specifically around: ${input.cameraFearSituation}.`
      : '',
    input.topicPreferences?.length
      ? `They enjoy talking about: ${input.topicPreferences.join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Write today's script. Topic: ${input.topicTitle}` },
      ],
      max_tokens: 300,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();
  const text: string | undefined = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenRouter returned no content');
  return text;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
