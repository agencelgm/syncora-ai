import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await base44.entities.UserProfile.filter({ created_by_id: user.id }, '-created_date', 1);
    const profile = profiles[0];

    if (!profile?.gohighlevel_api_key) {
      return Response.json({ error: 'GoHighLevel API key not configured' }, { status: 400 });
    }

    // Récupère les données de GoHighLevel (contacts, notes, tâches, rendez-vous)
    // Les endpoints varient selon l'API GoHighLevel
    const ghlResponse = await fetch('https://api.gohighlevel.com/v1/contacts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${profile.gohighlevel_api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!ghlResponse.ok) {
      return Response.json({ error: 'Failed to fetch GoHighLevel data' }, { status: 400 });
    }

    const contacts = await ghlResponse.json();

    return Response.json({
      source: 'gohighlevel',
      data: contacts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});