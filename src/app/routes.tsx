import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Clientes } from "./components/clientes/Clientes";
import { ClienteDetalhes } from "./components/clientes/ClienteDetalhes";
import { Pipeline } from "./components/pipeline/Pipeline";
import { Tarefas } from "./components/tarefas/Tarefas";
import { Relatorios } from "./components/relatorios/Relatorios";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Layout title="Painel">
        <Dashboard />
      </Layout>
    ),
  },
  {
    path: "/clientes",
    element: (
      <Layout title="Clientes">
        <Clientes />
      </Layout>
    ),
  },
  {
    path: "/pipeline",
    element: (
      <Layout title="Funil de Vendas">
        <Pipeline />
      </Layout>
    ),
  },
  {
    path: "/tarefas",
    element: (
      <Layout title="Atendimentos">
        <Tarefas />
      </Layout>
    ),
  },
  {
    path: "/relatorios",
    element: (
      <Layout title="Relatórios">
        <Relatorios />
      </Layout>
    ),
  },
  {
    path: "/cliente",
    element: (
      <Layout title="Ficha do Cliente">
        <ClienteDetalhes />
      </Layout>
    ),
  },
]);
