import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TASK_PRIORITIES = ['critical', 'high', 'medium', 'low'];

const normalizeTask = (task) => ({
  title: String(task?.title || '').trim(),
  description: String(task?.description || '').trim(),
  priority: TASK_PRIORITIES.includes(task?.priority) ? task.priority : 'medium',
  due_date: String(task?.due_date || '').trim(),
  due_time: String(task?.due_time || '').trim(),
  estimated_value_fcfa: Number(task?.estimated_value_fcfa) || 0,
  ai_priority_score: Number(task?.ai_priority_score) || 60,
  ai_coaching_note: String(task?.ai_coaching_note || '').trim(),
  tags: Array.isArray(task?.tags)
    ? task.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 5)
    : [],
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio_url } = await req.json();

    if (!audio_url) {
      return Response.json({ error: 'Missing audio_url' }, { status: 400 });
    }

    // Transcribe audio
    const transcript = await base44.integrations.Core.TranscribeAudio({
      audio_url,
    });

    // Extract tasks from transcript
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyse cette transcription et extrait des tâches concrètes et actionnables.
Retourne maximum 10 tâches en JSON.

Transcription:
"${transcript}"

Pour chaque tâche:
- title: titre court et actionnable
- description: contexte si nécessaire
- priority: "critical" | "high" | "medium" | "low"
- due_date: YYYY-MM-DD si mentionné, sinon ""
- due_time: HH:MM si mentionné, sinon ""
- estimated_value_fcfa: nombre, 0 si non applicable
- ai_priority_score: 1-100
- ai_coaching_note: phrase courte motivante
- tags: array de 0-5 mots-clés`,
      response_json_schema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string' },
                due_date: { type: 'string' },
                due_time: { type: 'string' },
                estimated_value_fcfa: { type: 'number' },
                ai_priority_score: { type: 'number' },
                ai_coaching_note: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    const tasks = (result?.tasks || [])
      .slice(0, 10)
      .map(normalizeTask)
      .filter(t => t.title);

    return Response.json({ tasks, transcript });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});