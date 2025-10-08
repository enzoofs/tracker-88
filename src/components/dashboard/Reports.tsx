import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Download, Users, Building, UserCheck, Truck, Package, DollarSign, Target, BarChart3
} from 'lucide-react';
import { useReportsData } from '@/hooks/useReportsData';
import ReportFilters from './ReportFilters';
import * as XLSX from 'xlsx';
import StageTimingAnalysis from './StageTimingAnalysis';

const Reports: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const { data, loading } = useReportsData(timeRange);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportToExcel = (reportType: string, reportData: any[]) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, reportType);
    XLSX.writeFile(workbook, `${reportType}-${timeRange}.xlsx`);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--status-delivered))', 'hsl(var(--status-shipping))', 'hsl(var(--status-production))'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios Detalhados</h2>
          <p className="text-muted-foreground">Análise detalhada por categoria</p>
        </div>
      </div>

      <ReportFilters selectedPeriod={timeRange} onPeriodChange={setTimeRange} />

      {/* Cards de Resumo Executivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalPedidos}</div>
            <p className="text-xs text-muted-foreground">Período selecionado</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-status-delivered" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-delivered">
              {formatCurrency(data.summary.valorTotal)}
            </div>
            <p className="text-xs text-muted-foreground">Receita total</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Target className="h-4 w-4 text-status-shipping" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-shipping">
              {formatCurrency(data.summary.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground">Por pedido</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Únicos</CardTitle>
            <BarChart3 className="h-4 w-4 text-status-production" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.statusUnicos}</div>
            <p className="text-xs text-muted-foreground">Categorias</p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Timing Analysis */}
      <StageTimingAnalysis />

      {/* Relatórios Tabulares */}
      <Tabs defaultValue="clientes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Relatório de Clientes
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToExcel('Clientes', data.clientes)}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total Pedidos</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clientes.slice(0, 10).map((cliente, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{cliente.cliente}</TableCell>
                      <TableCell>{cliente.totalPedidos}</TableCell>
                      <TableCell className="font-bold text-status-delivered">
                        {formatCurrency(cliente.valorTotal)}
                      </TableCell>
                      <TableCell>{formatCurrency(cliente.ticketMedio)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Relatório de Produtos
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToExcel('Produtos', data.fornecedores)}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Total Pedidos</TableHead>
                    <TableHead>Tempo Médio Entrega</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.fornecedores.slice(0, 10).map((fornecedor, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{fornecedor.fornecedor}</TableCell>
                      <TableCell>{fornecedor.totalPedidos}</TableCell>
                      <TableCell>
                        <span className={`${
                          fornecedor.tempoMedioEntrega <= 20 ? 'text-status-delivered' :
                          fornecedor.tempoMedioEntrega <= 30 ? 'text-status-production' :
                          'text-destructive'
                        }`}>
                          {fornecedor.tempoMedioEntrega.toFixed(0)} dias
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregas" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Relatório de Entregas
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToExcel('Entregas', data.entregas)}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Percentual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entregas.map((entrega, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{entrega.status}</TableCell>
                      <TableCell>{entrega.quantidade}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{entrega.percentual.toFixed(1)}%</span>
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${entrega.percentual}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;