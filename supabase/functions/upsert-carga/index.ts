import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const expectedToken = Deno.env.get('N8N_SHARED_TOKEN');
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Authentication failed');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const payload = await req.json();
    console.log('Received payload:', JSON.stringify(payload, null, 2));

    // Extract data from payload
    const data = payload[0] || payload;
    const email = data.email || {};
    const emailNorm = data.email_norm || {};
    
    // Extract numero_carga from subject (looking for patterns like BHZFIA25100050)
    const subject = email.subject || '';
    const numeroCargaMatch = subject.match(/[A-Z]{3}FIA\d{8}/i) || subject.match(/[A-Z]{6}\d{8}/i);
    const numero_carga = numeroCargaMatch ? numeroCargaMatch[0].toUpperCase() : null;

    if (!numero_carga) {
      console.error('No valid numero_carga found in subject:', subject);
      return new Response(
        JSON.stringify({ error: 'No valid cargo number found in email subject' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Processing cargo:', numero_carga);

    // Extract other information from email body and thread
    const bodyText = email.thread_completa || email.bodyPreview || '';
    const bodyLower = bodyText.toLowerCase();

    // Extract dates
    let data_embarque_prevista = null;
    let data_chegada_prevista = null;
    
    // Look for departure date patterns like "DIA 28/10" or "28/10"
    const embarqueMatch = bodyText.match(/embarque.*?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
    if (embarqueMatch) {
      const dateStr = embarqueMatch[1];
      data_embarque_prevista = parseBrazilianDate(dateStr);
    }

    // Look for arrival date patterns
    const chegadaMatch = bodyText.match(/chegada.*?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
    if (chegadaMatch) {
      const dateStr = chegadaMatch[1];
      data_chegada_prevista = parseBrazilianDate(dateStr);
    }

    // Extract invoices
    const invoices: any[] = [];
    const invoiceMatches = bodyText.matchAll(/invoice[:\s]+([A-Z0-9]+(?:\s*[–-]\s*[A-Z0-9]+)?)/gi);
    for (const match of invoiceMatches) {
      const invoiceNumbers = match[1].split(/\s*[–-]\s*/).filter(n => n.trim());
      invoiceNumbers.forEach(num => {
        if (!invoices.find(inv => inv.numero === num.trim())) {
          invoices.push({ numero: num.trim() });
        }
      });
    }

    // Extract HAWB
    const hawb = numero_carga; // The cargo number is the HAWB

    // Extract MAWB if present
    const mawbMatch = bodyText.match(/mawb[:\s]+([A-Z0-9-]+)/i);
    const mawb = mawbMatch ? mawbMatch[1].trim() : null;

    // Extract destination (Confins, GRU, etc)
    let destino = null;
    if (bodyLower.includes('confins')) {
      destino = 'Confins (CNF)';
    } else if (bodyLower.includes('guarulhos') || bodyLower.includes('gru')) {
      destino = 'Guarulhos (GRU)';
    } else if (bodyLower.includes('viracopos') || bodyLower.includes('vcp')) {
      destino = 'Viracopos (VCP)';
    }

    // Extract carrier/transportadora
    const fromEmail = email.from?.address || '';
    let transportadora = null;
    if (fromEmail.includes('globexlogistics')) {
      transportadora = 'Globex Logistics';
    } else if (fromEmail.includes('fastglobal')) {
      transportadora = 'Fast Global';
    }

    // Determine status based on email content
    let status = 'Em Preparação';
    if (bodyLower.includes('embarque') && bodyLower.includes('previsto')) {
      status = 'Aguardando Embarque';
    } else if (bodyLower.includes('embarcado') || bodyLower.includes('em trânsito')) {
      status = 'Em Trânsito';
    } else if (bodyLower.includes('chegada') && bodyLower.includes('prevista')) {
      status = 'Em Trânsito';
    } else if (bodyLower.includes('entregue')) {
      status = 'Entregue';
    }

    // Determine temperatura control
    let tipo_temperatura = null;
    if (bodyLower.includes('gel pack') || bodyLower.includes('cold chain') || bodyLower.includes('temperatura controlada')) {
      tipo_temperatura = 'Temperatura Controlada';
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if cargo already exists
    const { data: existingCarga } = await supabase
      .from('cargas')
      .select('*')
      .eq('numero_carga', numero_carga)
      .maybeSingle();

    console.log('Existing cargo:', existingCarga ? 'Found' : 'Not found');

    // Prepare data for upsert
    const cargoData: any = {
      numero_carga,
      status,
      updated_at: new Date().toISOString(),
    };

    // Only add fields if they have values
    if (hawb) cargoData.hawb = hawb;
    if (mawb) cargoData.mawb = mawb;
    if (destino) cargoData.destino = destino;
    if (transportadora) cargoData.transportadora = transportadora;
    if (tipo_temperatura) cargoData.tipo_temperatura = tipo_temperatura;
    if (data_embarque_prevista) cargoData.data_embarque_prevista = data_embarque_prevista;
    if (data_chegada_prevista) cargoData.data_chegada_prevista = data_chegada_prevista;
    
    // Handle invoices - merge with existing if updating
    if (invoices.length > 0) {
      if (existingCarga?.invoices) {
        const existingInvoices = Array.isArray(existingCarga.invoices) ? existingCarga.invoices : [];
        const mergedInvoices = [...existingInvoices];
        invoices.forEach(newInv => {
          if (!mergedInvoices.find(inv => inv.numero === newInv.numero)) {
            mergedInvoices.push(newInv);
          }
        });
        cargoData.invoices = mergedInvoices;
      } else {
        cargoData.invoices = invoices;
      }
    }

    // Set ultima_localizacao based on status
    if (status === 'Aguardando Embarque') {
      cargoData.ultima_localizacao = 'Origem';
    } else if (status === 'Em Trânsito') {
      cargoData.ultima_localizacao = 'Em Trânsito';
    }

    // Perform upsert
    const { data: upsertedCarga, error: upsertError } = await supabase
      .from('cargas')
      .upsert(cargoData, { 
        onConflict: 'numero_carga',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Database upsert failed', details: upsertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log history
    const { error: historyError } = await supabase
      .from('carga_historico')
      .insert({
        numero_carga,
        evento: existingCarga ? 'Atualização' : 'Criação',
        descricao: existingCarga 
          ? `Carga atualizada via email - Status: ${status}`
          : `Carga criada via email - Status: ${status}`,
        localizacao: cargoData.ultima_localizacao || null,
      });

    if (historyError) {
      console.error('History insert error:', historyError);
    }

    console.log('Cargo upserted successfully:', numero_carga);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: existingCarga ? 'updated' : 'created',
        data: upsertedCarga 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to parse Brazilian date format (DD/MM or DD/MM/YYYY)
function parseBrazilianDate(dateStr: string): string | null {
  try {
    const parts = dateStr.split('/');
    if (parts.length < 2) return null;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    let year = parts.length === 3 ? parseInt(parts[2]) : new Date().getFullYear();
    
    // If year is 2 digits, assume 20XX
    if (year < 100) year += 2000;
    
    const date = new Date(year, month, day);
    
    // Validate date
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString();
  } catch {
    return null;
  }
}
