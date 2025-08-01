import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, AlertTriangle, Clock, Package, TrendingDown, 
  Settings, Plus, X, CheckCircle, Zap, Target,
  Thermometer, Truck, Globe, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: 'delay' | 'temperature' | 'custom' | 'performance' | 'volume';
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  recipients: string[];
  lastTriggered?: string;
  triggerCount: number;
}

interface ActiveAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  salesOrder?: string;
  cliente?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  details: any;
}

const SmartAlerts: React.FC = () => {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    description: '',
    type: 'delay',
    condition: 'greater_than',
    threshold: 0,
    severity: 'medium',
    isActive: true,
    recipients: []
  });
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const { toast } = useToast();

  // Predefined alert rules
  const defaultRules: AlertRule[] = [
    {
      id: '1',
      name: 'Atraso Crítico na Entrega',
      description: 'Alertar quando entregas atrasam mais de 5 dias do prazo',
      type: 'delay',
      condition: 'greater_than',
      threshold: 5,
      severity: 'critical',
      isActive: true,
      recipients: ['logistics@company.com'],
      triggerCount: 12,
      lastTriggered: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      name: 'Temperatura Fora do Padrão',
      description: 'Monitorar cargas que requerem temperatura controlada',
      type: 'temperature',
      condition: 'outside_range',
      threshold: 8,
      severity: 'high',
      isActive: true,
      recipients: ['quality@company.com', 'logistics@company.com'],
      triggerCount: 3,
      lastTriggered: '2024-01-14T15:45:00Z'
    },
    {
      id: '3',
      name: 'Queda na Performance de Entrega',
      description: 'Alertar quando taxa de pontualidade cai abaixo de 85%',
      type: 'performance',
      condition: 'less_than',
      threshold: 85,
      severity: 'medium',
      isActive: true,
      recipients: ['management@company.com'],
      triggerCount: 2,
      lastTriggered: '2024-01-13T09:15:00Z'
    },
    {
      id: '4',
      name: 'Volume Alto de Pedidos',
      description: 'Alertar quando volume diário excede capacidade planejada',
      type: 'volume',
      condition: 'greater_than',
      threshold: 50,
      severity: 'medium',
      isActive: true,
      recipients: ['operations@company.com'],
      triggerCount: 8,
      lastTriggered: '2024-01-15T16:20:00Z'
    }
  ];

  // Generate active alerts based on current data
  const generateActiveAlerts = (): ActiveAlert[] => {
    const alerts: ActiveAlert[] = [
      {
        id: 'alert-1',
        ruleId: '1',
        ruleName: 'Atraso Crítico na Entrega',
        message: 'SO-2024-0123 está 7 dias atrasada na entrega para cliente ABC Corp',
        severity: 'critical',
        timestamp: '2024-01-15T10:30:00Z',
        salesOrder: 'SO-2024-0123',
        cliente: 'ABC Corp',
        status: 'active',
        details: {
          expectedDate: '2024-01-08',
          currentDate: '2024-01-15',
          delayDays: 7,
          lastLocation: 'São Paulo - SP'
        }
      },
      {
        id: 'alert-2',
        ruleId: '2',
        ruleName: 'Temperatura Fora do Padrão',
        message: 'Carga 1234 registrou temperatura de 15°C, acima do limite de 8°C',
        severity: 'high',
        timestamp: '2024-01-14T15:45:00Z',
        salesOrder: 'SO-2024-0098',
        cliente: 'BioTech Ltd',
        status: 'acknowledged',
        details: {
          currentTemp: 15,
          maxTemp: 8,
          location: 'Armazém Miami',
          duration: '2 horas'
        }
      },
      {
        id: 'alert-3',
        ruleId: '3',
        ruleName: 'Queda na Performance',
        message: 'Taxa de pontualidade desta semana caiu para 82%',
        severity: 'medium',
        timestamp: '2024-01-13T09:15:00Z',
        status: 'active',
        details: {
          currentRate: 82,
          targetRate: 85,
          weeklyDeliveries: 45,
          onTimeDeliveries: 37
        }
      }
    ];

    return alerts;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // In a real implementation, these would come from Supabase
      setAlertRules(defaultRules);
      setActiveAlerts(generateActiveAlerts());
      
      setLoading(false);
    };

    loadData();
  }, []);

  const toggleRule = async (ruleId: string) => {
    setAlertRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, isActive: !rule.isActive }
          : rule
      )
    );

    toast({
      title: "Regra atualizada",
      description: "A configuração do alerta foi salva com sucesso."
    });
  };

  const addNewRule = async () => {
    if (!newRule.name || !newRule.description) {
      toast({
        title: "Erro",
        description: "Nome e descrição são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const rule: AlertRule = {
      id: Date.now().toString(),
      name: newRule.name!,
      description: newRule.description!,
      type: newRule.type!,
      condition: newRule.condition!,
      threshold: newRule.threshold!,
      severity: newRule.severity!,
      isActive: newRule.isActive!,
      recipients: newRule.recipients!,
      triggerCount: 0
    };

    setAlertRules(prev => [...prev, rule]);
    setShowNewRuleForm(false);
    setNewRule({
      name: '',
      description: '',
      type: 'delay',
      condition: 'greater_than',
      threshold: 0,
      severity: 'medium',
      isActive: true,
      recipients: []
    });

    toast({
      title: "Regra criada",
      description: "Nova regra de alerta foi adicionada com sucesso."
    });
  };

  const acknowledgeAlert = (alertId: string) => {
    setActiveAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId
          ? { ...alert, status: 'acknowledged' }
          : alert
      )
    );

    toast({
      title: "Alerta reconhecido",
      description: "O alerta foi marcado como reconhecido."
    });
  };

  const resolveAlert = (alertId: string) => {
    setActiveAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId
          ? { ...alert, status: 'resolved' }
          : alert
      )
    );

    toast({
      title: "Alerta resolvido",
      description: "O alerta foi marcado como resolvido."
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-500 bg-blue-50 border-blue-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delay': return <Clock className="h-4 w-4" />;
      case 'temperature': return <Thermometer className="h-4 w-4" />;
      case 'performance': return <Target className="h-4 w-4" />;
      case 'volume': return <Package className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sistema de Alertas Inteligente</h2>
          <p className="text-muted-foreground">Monitore e configure alertas automatizados</p>
        </div>
        <Button onClick={() => setShowNewRuleForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Alertas Ativos</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="analytics">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Alert Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold text-red-500">
                      {activeAlerts.filter(a => a.severity === 'critical').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Críticos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold text-orange-500">
                      {activeAlerts.filter(a => a.severity === 'high').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Altos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {activeAlerts.filter(a => a.status === 'acknowledged').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Reconhecidos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {activeAlerts.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Ativo</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts List */}
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <Card key={alert.id} className={`shadow-card border-l-4 ${getSeverityColor(alert.severity)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                      <span className="font-medium">{alert.ruleName}</span>
                      {alert.status === 'acknowledged' && (
                        <Badge variant="outline">Reconhecido</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(alert.timestamp)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm mb-3">{alert.message}</p>
                  
                  {alert.salesOrder && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>SO: {alert.salesOrder}</span>
                      {alert.cliente && <span>Cliente: {alert.cliente}</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {alert.status === 'active' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Reconhecer
                        </Button>
                        <Button size="sm" onClick={() => resolveAlert(alert.id)}>
                          <X className="h-3 w-3 mr-1" />
                          Resolver
                        </Button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <Button size="sm" onClick={() => resolveAlert(alert.id)}>
                        <X className="h-3 w-3 mr-1" />
                        Resolver
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {/* New Rule Form */}
          {showNewRuleForm && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Nova Regra de Alerta
                  <Button variant="ghost" size="sm" onClick={() => setShowNewRuleForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da Regra</Label>
                    <Input
                      id="name"
                      value={newRule.name || ''}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Atraso na Entrega"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <select
                      className="w-full h-10 px-3 border rounded-md"
                      value={newRule.type}
                      onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value as any }))}
                    >
                      <option value="delay">Atraso</option>
                      <option value="temperature">Temperatura</option>
                      <option value="performance">Performance</option>
                      <option value="volume">Volume</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={newRule.description || ''}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva quando este alerta deve ser acionado"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="condition">Condição</Label>
                    <select
                      className="w-full h-10 px-3 border rounded-md"
                      value={newRule.condition}
                      onChange={(e) => setNewRule(prev => ({ ...prev, condition: e.target.value }))}
                    >
                      <option value="greater_than">Maior que</option>
                      <option value="less_than">Menor que</option>
                      <option value="equals">Igual a</option>
                      <option value="outside_range">Fora do intervalo</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="threshold">Limite</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={newRule.threshold || 0}
                      onChange={(e) => setNewRule(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="severity">Severidade</Label>
                    <select
                      className="w-full h-10 px-3 border rounded-md"
                      value={newRule.severity}
                      onChange={(e) => setNewRule(prev => ({ ...prev, severity: e.target.value as any }))}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={addNewRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Regra
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewRuleForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Rules */}
          <div className="space-y-4">
            {alertRules.map((rule) => (
              <Card key={rule.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(rule.type)}
                      <div>
                        <CardTitle className="text-base">{rule.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={rule.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {rule.severity}
                      </Badge>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Condição:</span>
                      <div className="font-medium">
                        {rule.condition.replace('_', ' ')} {rule.threshold}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Acionado:</span>
                      <div className="font-medium">{rule.triggerCount}x</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Último:</span>
                      <div className="font-medium">
                        {rule.lastTriggered ? formatDate(rule.lastTriggered) : 'Nunca'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics about alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Performance dos Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Taxa de Resolução</span>
                    <span className="font-bold">87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tempo Médio Resposta</span>
                    <span className="font-bold">2.3h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Alertas Preventivos</span>
                    <span className="font-bold">64%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Economia Estimada</span>
                    <span className="font-bold text-green-600">R$ 145k</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Tendências Mensais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Alertas Gerados</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">156</span>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">-12%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Falsos Positivos</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">8</span>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">-23%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Regras Ativas</span>
                    <span className="font-bold">{alertRules.filter(r => r.isActive).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartAlerts;
