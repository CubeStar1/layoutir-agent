import { createSupabaseServer } from '@/lib/supabase/server';
import { getUser } from '@/app/chat/hooks/get-user';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  const user = await getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServer();
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return Response.json(data);
}
