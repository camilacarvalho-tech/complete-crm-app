import { createBrowserRouter } from "react-router-dom";

import { Layout } from "./components/layout/Layout";

import { Dashboard } from "./components/dashboard/Dashboard";
import { Clientes } from "./components/clientes/Clientes";
import { Pipeline } from "./components/pipeline/Pipeline";
import { Tarefas } from "./components/tarefas/Tarefas";
import { Relatorios } from "./components/relatorios/Relatorios";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Layout title="Dashboard">
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
      <Layout title="Pipeline">
        <Pipeline />
      </Layout>
    ),
  },

  {
    path: "/tarefas",
    element: (
      <Layout title="Tarefas">
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
]);