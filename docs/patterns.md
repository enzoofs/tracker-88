# Padrões de Design

## Padrões Arquiteturais

### Component-Based Architecture
O sistema segue a arquitetura baseada em componentes do React, onde cada funcionalidade é encapsulada em componentes reutilizáveis e compostos.

**Estrutura**:
```
src/components/
├── auth/              # Autenticação e autorização
├── dashboard/         # Componentes do dashboard principal
└── ui/                # Componentes UI reutilizáveis (shadcn/ui)
```

### Custom Hooks Pattern
Lógica de negócio e side effects são extraídos em custom hooks para reusabilidade e testabilidade.

**Exemplos**:
- `useSLACalculator`: Cálculo de SLA e urgência ([src/hooks/useSLACalculator.ts](../src/hooks/useSLACalculator.ts))
- `useAuth`: Gerenciamento de autenticação ([src/components/auth/AuthProvider.tsx](../src/components/auth/AuthProvider.tsx))
- `useTheme`: Controle de dark/light mode
- `useToast`: Sistema de notificações toast

### Provider Pattern
Contextos React para compartilhar estado global sem prop drilling.

**Providers implementados**:
- `AuthProvider`: Estado de autenticação e usuário logado
- `ThemeProvider`: Tema dark/light mode
- `QueryClientProvider`: Cache do TanStack Query

### Compound Components
Componentes complexos compostos por subcomponentes relacionados (pattern usado pelo shadcn/ui).

**Exemplo** (Tabs):
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger>Tab 1</TabsTrigger>
  </TabsList>
  <TabsContent>Content</TabsContent>
</Tabs>
```

## Padrões de Código

### Container/Presentational Pattern
Separação entre componentes que gerenciam lógica (containers) e componentes puramente visuais (presentational).

**Containers** (Smart Components):
- `LogisticsDashboard`: Gerencia estado, fetching, realtime subscriptions
- `SOTable`: Lógica de ordenação, filtros, paginação
- `CargoDetails`: Load de dados relacionados, transformações

**Presentational** (Dumb Components):
- `CargoCard`: Apenas renderiza dados passados via props
- `Overview`: Cards de métricas visuais
- `Timeline`: Visualização de histórico

### Render Props (implícito via shadcn/ui)
Componentes que aceitam funções como children para customização de renderização.

**Exemplo** (Dialog):
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    {/* Custom content */}
  </DialogContent>
</Dialog>
```

### State Management Pattern

#### Local State (useState)
Para estado específico de um componente:
```tsx
const [loading, setLoading] = useState(false);
const [selectedCargo, setSelectedCargo] = useState(null);
```

#### Server State (TanStack Query)
Para dados do backend com cache:
```tsx
const { data, isLoading } = useQuery({
  queryKey: ['envios'],
  queryFn: () => supabase.from('envios_processados').select('*')
});
```

#### Global State (Context API)
Para estado compartilhado entre componentes:
```tsx
const { user, signOut } = useAuth();
const { theme, setTheme } = useTheme();
```

## Organização de Código

### Estrutura de Diretórios

```
src/
├── components/
│   ├── auth/                  # Autenticação
│   │   ├── AuthProvider.tsx   # Context de auth
│   │   ├── ProtectedRoute.tsx # Route guard
│   │   └── ThemeProvider.tsx  # Tema dark/light
│   ├── dashboard/             # Dashboard principal
│   │   ├── LogisticsDashboard.tsx  # Container principal
│   │   ├── Overview.tsx            # Métricas resumidas
│   │   ├── SOTable.tsx             # Tabela de SOs
│   │   ├── CargoCard.tsx           # Card de carga
│   │   ├── CargoDetails.tsx        # Modal de detalhes
│   │   ├── SODetails.tsx           # Modal de SO
│   │   ├── Charts.tsx              # Gráficos
│   │   ├── Reports.tsx             # Relatórios
│   │   ├── NotificationCenter.tsx  # Central de notificações
│   │   └── BulkCargoUpload.tsx     # Upload de Excel
│   └── ui/                    # Componentes shadcn/ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (30+ componentes)
├── hooks/
│   ├── useSLACalculator.ts    # Hook de cálculo de SLA
│   └── use-toast.ts           # Hook de toast notifications
├── integrations/
│   └── supabase/
│       └── client.ts          # Cliente Supabase configurado
├── lib/
│   └── utils.ts               # Funções utilitárias (cn, formatters)
├── pages/
│   ├── Index.tsx              # Página principal (dashboard)
│   └── Login.tsx              # Página de login
└── App.tsx                    # Configuração de rotas
```

### Convenções de Nomenclatura

#### Componentes
- **PascalCase**: `LogisticsDashboard.tsx`, `CargoCard.tsx`
- **Sufixo descritivo**: `SOTable`, `BulkCargoUpload`
- **Componentes UI**: lowercase com hífen (`button.tsx`, `dialog.tsx`)

#### Hooks
- **Prefixo "use"**: `useSLACalculator`, `useAuth`, `useToast`
- **camelCase**: `useSLACalculator.ts`

#### Funções e Variáveis
- **camelCase**: `loadDashboardData`, `handleSOClick`, `filteredSOs`
- **Handlers**: Prefixo "handle" (`handleExportToXLSX`, `handleCargoClick`)
- **Loaders**: Prefixo "load" (`loadDashboardData`, `loadNotificationCount`)
- **Booleans**: Prefixo "is", "has", "should" (`isLoading`, `hasError`, `showDelivered`)

#### Constantes
- **UPPER_SNAKE_CASE**: Para constantes globais (não muito usado)
- **camelCase**: Para const locais (`supabase`, `toast`)

#### Types e Interfaces
- **PascalCase**: `DashboardData`, `CargoDetails`
- **Interfaces**: Preferência por `type` ao invés de `interface` (TypeScript)
- **Props**: Sufixo "Props" opcional (`CargoCardProps`)

### Organização de Imports

**Ordem padrão**:
1. React e bibliotecas externas
2. Componentes de UI (shadcn/ui)
3. Componentes locais
4. Hooks customizados
5. Utilitários e tipos
6. Estilos (se necessário)

**Exemplo**:
```tsx
// 1. React e externas
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3. Componentes locais
import { SOTable } from './SOTable';
import { Overview } from './Overview';

// 4. Hooks
import { useAuth } from '@/components/auth/AuthProvider';
import { useSLACalculator } from '@/hooks/useSLACalculator';

// 5. Utilitários
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
```

## Padrões de Teste

### Status Atual
⚠️ **Testes não implementados ainda** - Planejado para futuro próximo.

### Estratégia Planejada

#### Unit Tests (Jest + React Testing Library)
- Testar hooks isoladamente (`useSLACalculator`)
- Testar funções utilitárias (`lib/utils.ts`)
- Testar componentes simples (buttons, cards)

#### Integration Tests
- Testar fluxos completos (login → dashboard → detalhes)
- Testar integração com Supabase (mocked)
- Testar formulários com validação

#### E2E Tests (Playwright)
- Testar user journeys críticos
- Testar upload de Excel
- Testar export para XLSX/PDF

## Padrões de Tratamento de Erros

### Frontend Error Handling

#### Try-Catch Pattern
```tsx
const loadData = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from('envios_processados')
      .select('*');

    if (error) throw error;

    setData(data);
  } catch (error) {
    console.error('Error loading data:', error);
    toast({
      title: "Erro ao carregar dados",
      description: "Não foi possível carregar os dados.",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};
```

#### Toast Notifications
- **Sucesso**: Toast verde com ícone de check
- **Erro**: Toast vermelho com variant "destructive"
- **Info**: Toast padrão azul

#### Logging
- `console.log` para debugging (deve ser removido em produção)
- `console.error` para erros
- Emojis para categorizar logs (`🔍`, `📦`, `✅`, `❌`)

### Supabase Error Handling
```tsx
const { data, error } = await supabase.from('table').select('*');
if (error) {
  // Supabase retorna error object ao invés de throw
  console.error('Supabase error:', error);
  // Handle error...
}
```

### Realtime Subscription Error Handling
```tsx
supabase
  .channel('channel-name')
  .on('postgres_changes', { ... }, (payload) => {
    try {
      // Process payload
    } catch (error) {
      console.error('Error processing realtime event:', error);
    }
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIPTION_ERROR') {
      console.error('Subscription error');
    }
  });
```

## Boas Práticas Específicas

### React Hooks Rules
- Sempre chamar hooks no top level (nunca em condicionais)
- Usar `useCallback` para funções passadas como props
- Usar `useMemo` para cálculos pesados
- Custom hooks devem começar com "use"

### Performance Optimization

#### Memoization
```tsx
const expensiveCalculation = useMemo(() => {
  return calculateSLA(data);
}, [data]);

const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

#### Lazy Loading
```tsx
const Charts = lazy(() => import('./Charts'));
const Reports = lazy(() => import('./Reports'));

<Suspense fallback={<Loading />}>
  <Charts />
</Suspense>
```

#### Debouncing (para inputs de busca)
```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);
```

### Acessibilidade (A11y)

#### Semantic HTML
- Uso de tags semânticas (`<nav>`, `<main>`, `<section>`)
- Uso de `<button>` para ações (não `<div onClick>`)
- Labels para inputs (`<label htmlFor="input-id">`)

#### ARIA Attributes (via Radix UI)
- `aria-label` para botões sem texto
- `aria-describedby` para descrições
- `role` para elementos customizados
- `aria-expanded`, `aria-selected` para estados

#### Keyboard Navigation
- Tab order lógico
- Enter/Space para ativar botões
- Escape para fechar modais
- Arrow keys para navegação em listas

### Segurança

#### Input Sanitization
```tsx
// Zod schema para validação
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Validação no submit
const onSubmit = (data) => {
  const validated = schema.parse(data);
  // Safe to use validated data
};
```

#### XSS Prevention
- React escapa strings automaticamente
- Evitar `dangerouslySetInnerHTML`
- Sanitizar dados de fontes externas

#### Authentication Guards
```tsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

#### Environment Variables
- Nunca commitar `.env`
- Usar `VITE_` prefix para variáveis expostas ao client
- API keys sensíveis apenas no backend (Supabase RLS)

## Code Reviews e Convenções de Equipe

### Git Commit Messages
**Formato**: `tipo: descrição breve`

**Tipos**:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração sem mudança de comportamento
- `style`: Formatação, espaços, etc.
- `docs`: Documentação
- `chore`: Tarefas de build, dependências

**Exemplos**:
```
feat: adicionar bulk upload de cargas
fix: corrigir cálculo de SLA para dias úteis
refactor: extrair lógica de SLA para hook customizado
docs: atualizar README com instruções de deploy
```

### Pull Requests
- Título descritivo
- Descrição com contexto e screenshots
- Checklist de teste manual
- Review obrigatório antes de merge (se equipe)

### Code Style
- Prettier configurado (ou seguir padrão Lovable)
- ESLint rules habilitadas
- Máximo de 300 linhas por arquivo (guideline, não regra rígida)
- Preferir funções pequenas e focadas

## Padrões Futuros (Planejados)

### Error Boundaries
Capturar erros de renderização e mostrar fallback UI.

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <Dashboard />
</ErrorBoundary>
```

### Storybook
Documentar e desenvolver componentes UI isoladamente.

### Design System
Formalizar tokens de design (cores, espaçamentos, tipografia) em um sistema unificado.

### Micro Frontends
Se o sistema crescer muito, considerar separar em múltiplas apps independentes.

---

*Estes padrões refletem o estado atual do código e evoluem conforme o projeto cresce*
