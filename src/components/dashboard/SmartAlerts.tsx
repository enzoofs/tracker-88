import { FC, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, AlertTriangle, Clock, Package, 
  Settings, Plus, X, CheckCircle, Zap, Target,
  Thermometer, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSLACalculator } from '@/hooks/useSLACalculator';

interface AlertRule {
  id: string;
  name: string;
  type: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  active: boolean;
}

interface ActiveAlert {
  id: string;
  rule_id: string | null;
  sales_order: string | null;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: string;
}

const SmartAlerts: FC = () => {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    type: 'delay',
    condition: 'greater_than',
    threshold: 0,
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);

      // Load alert rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('alert_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (rulesError) throw rulesError;

      setAlertRules((rulesData || []).map(rule => ({
        ...rule,
        severity: rule.severity as 'low' | 'medium' | 'high' | 'critical'
      })));

      // Load active alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('active_alerts')
        .select('*')
        .in('status', ['active', 'acknowledged'])
        .order('timestamp', { ascending: false });

      if (alertsError) throw alertsError;

      setActiveAlerts((alertsData || []).map(alert => ({
        ...alert,
        severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
        status: alert.status as 'active' | 'acknowledged' | 'resolved'
      })));

      // Generate alerts based on current SO data
      await generateAlertsFromSOs();

    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os alertas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAlertsFromSOs = async () => {
    try {
      // Get all rules
      const { data: rules } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('active', true);

      if (!rules || rules.length === 0) return;

      // Get all SOs
      const { data: envios } = await supabase
        .from('envios_processados')
        .select('*')
        .eq('is_delivered', false);

      if (!envios) return;

      // Check each SO against delay rules
      for (const envio of envios) {
        const now = new Date();
        const lastUpdate = new Date(envio.data_ultima_atualizacao || envio.created_at);
        const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

        // Check delay rules
        const delayRule = rules.find(r => r.type === 'delay' && daysSinceUpdate >= r.threshold);
        if (delayRule) {
          // Check if alert already exists
          const { data: existing } = await supabase
            .from('active_alerts')
            .select('id')
            .eq('sales_order', envio.sales_order)
            .eq('rule_id', delayRule.id)
            .in('status', ['active', 'acknowledged'])
            .single();

          if (!existing) {
            await supabase
              .from('active_alerts')
              .insert({
                rule_id: delayRule.id,
                sales_order: envio.sales_order,
                message: `Pedido ${envio.sales_order} está há ${daysSinceUpdate} dias sem atualização (Cliente: ${envio.cliente})`,
                severity: delayRule.severity,
                status: 'active'
              });
          }
        }

        // Check delivery deadline rules
        const deliveryRule = rules.find(r => r.type === 'delivery');
        if (deliveryRule) {
          // Use SLA calculator
          const slaInfo = useSLACalculator(envio as any);
          if (slaInfo && slaInfo.daysRemaining <= deliveryRule.threshold) {
            const { data: existing } = await supabase
              .from('active_alerts')
              .select('id')
              .eq('sales_order', envio.sales_order)
              .eq('rule_id', deliveryRule.id)
              .in('status', ['active', 'acknowledged'])
              .single();

            if (!existing) {
              await supabase
                .from('active_alerts')
                .insert({
                  rule_id: deliveryRule.id,
                  sales_order: envio.sales_order,
                  message: `Entrega crítica: ${envio.sales_order} deve ser entregue em ${slaInfo.daysRemaining} dias (Cliente: ${envio.cliente})`,
                  severity: deliveryRule.severity,
                  status: 'active'
                });
            }
          }
        }
      }

      // Reload alerts after generation
      const { data: updatedAlerts } = await supabase
        .from('active_alerts')
        .select('*')
        .in('status', ['active', 'acknowledged'])
        .order('timestamp', { ascending: false });

      if (updatedAlerts) {
        setActiveAlerts(updatedAlerts.map(alert => ({
          ...alert,
          severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
          status: alert.status as 'active' | 'acknowledged' | 'resolved'
        })));
      }

    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  };

  useEffect(() => {
    loadData();
    
    // Refresh alerts every 5 minutes
    const interval = setInterval(() => {
      generateAlertsFromSOs();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleRule = async (ruleId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('alert_rules')
        .update({ active: !currentState })
        .eq('id', ruleId);

      if (error) throw error;

      setAlertRules(prev => 
        prev.map(rule => 
          rule.id === ruleId 
            ? { ...rule, active: !currentState }
            : rule
        )
      );

      toast({
        title: "Regra atualizada",
        description: "A configuração do alerta foi salva com sucesso."
      });
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a regra.",
        variant: "destructive"
      });
    }
  };

  const addNewRule = async () => {
    if (!newRule.name) {
      toast({
        title: "Erro",
        description: "Nome da regra é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('alert_rules')
        .insert({
          name: newRule.name,
          type: newRule.type,
          condition: newRule.condition,
          threshold: newRule.threshold,
          severity: newRule.severity,
          active: true
        });

      if (error) throw error;

      toast({
        title: "Regra criada",
        description: "Nova regra de alerta foi adicionada com sucesso."
      });

      setShowNewRuleForm(false);
      setNewRule({
        name: '',
        type: 'delay',
        condition: 'greater_than',
        threshold: 0,
        severity: 'medium'
      });

      loadData();
    } catch (error) {
      console.error('Error adding rule:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a regra.",
        variant: "destructive"
      });
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('active_alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

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
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('active_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));

      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido."
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-destructive';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-status-production';
      case 'low': return 'border-blue-500';
      default: return 'border-border';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delay': return <Clock className="h-4 w-4" />;
      case 'temperature': return <Thermometer className="h-4 w-4" />;
      case 'performance': return <Target className="h-4 w-4" />;
      case 'volume': return <Package className="h-4 w-4" />;
      case 'tracking': return <Activity className="h-4 w-4" />;
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
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="text-2xl font-bold text-destructive">
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
                  <CheckCircle className="h-4 w-4 text-status-delivered" />
                  <div>
                    <div className="text-2xl font-bold text-status-delivered">
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
                  <Activity className="h-4 w-4 text-primary" />
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
            {activeAlerts.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-status-delivered mx-auto mb-3" />
                  <p className="text-lg font-medium">Nenhum alerta ativo</p>
                  <p className="text-sm text-muted-foreground">Tudo funcionando perfeitamente!</p>
                </CardContent>
              </Card>
            ) : (
              activeAlerts.map((alert) => (
                <Card key={alert.id} className={`shadow-card border-l-4 ${getSeverityColor(alert.severity)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.severity}
                        </Badge>
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
                    
                    {alert.sales_order && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span>SO: {alert.sales_order}</span>
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
              ))
            )}
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
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Atraso na Entrega"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <select
                      className="w-full h-10 px-3 border rounded-md"
                      value={newRule.type}
                      onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="delay">Atraso</option>
                      <option value="temperature">Temperatura</option>
                      <option value="performance">Performance</option>
                      <option value="volume">Volume</option>
                      <option value="tracking">Tracking</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="threshold">Limite (dias)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={newRule.threshold}
                      onChange={(e) => setNewRule(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
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

                <Button onClick={addNewRule} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Regra
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rules List */}
          <div className="space-y-3">
            {alertRules.map((rule) => (
              <Card key={rule.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(rule.type)}
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Limite: {rule.threshold} | Severidade: {rule.severity}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={rule.active}
                      onCheckedChange={() => toggleRule(rule.id, rule.active)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Estatísticas de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total de Regras Ativas:</span>
                  <span className="font-bold">{alertRules.filter(r => r.active).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Alertas Ativos:</span>
                  <span className="font-bold">{activeAlerts.filter(a => a.status === 'active').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Alertas Reconhecidos:</span>
                  <span className="font-bold">{activeAlerts.filter(a => a.status === 'acknowledged').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartAlerts;
