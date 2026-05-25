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

    if (!profile?.chariow_api_key) {
      return Response.json({ error: 'Chariow API key not configured' }, { status: 400 });
    }

    // Récupère les transactions de Chariow
    // Les endpoints varient selon l'API Chariow
    const chariowResponse = await fetch('https://api.chariow.com/v1/transactions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${profile.chariow_api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!chariowResponse.ok) {
      return Response.json({ error: 'Failed to fetch Chariow data' }, { status: 400 });
    }

    const transactions = await chariowResponse.json();

    return Response.json({
      source: 'chariow',
      data: transactions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});