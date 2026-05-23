import { createRouter, createWebHistory } from "vue-router";

import AppLayout from "@/layout/AppLayout.vue";
import CollectionLayout from "@/layout/CollectionLayout.vue";

import DashboardView from "@/views/DashboardView.vue";
import CollectionsView from "@/views/CollectionsView.vue";
import DataBrowserView from "@/views/DataBrowserView.vue";
import AggregationView from "@/views/AggregationView.vue";
import ConnectView from "@/views/ConnectView.vue";

export enum ROUTE_NAME {
  DASHBOARD = "dashbaord",
  CONNECT = "connect",
  COLLECTIONS = "collections",
  DOCUMENTS = "documents",
  AGGREGATION = "aggregation",
  COLLECTIONS_LIST = "collections-list",
}

const hasOpenConnections = (() => {
  try {
    const open = sessionStorage.getItem("nosql-manager-open");
    return open ? (JSON.parse(open) as unknown[]).length > 0 : false;
  } catch {
    return false;
  }
})();

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: hasOpenConnections ? "/dashboard" : "/connect",
      component: AppLayout,
      children: [
        {
          path: "/dashboard",
          name: ROUTE_NAME.DASHBOARD,
          component: DashboardView,
        },
        {
          path: "/collections",
          name: ROUTE_NAME.COLLECTIONS,
          component: CollectionLayout,
          children: [
            {
              path: "",
              name: ROUTE_NAME.COLLECTIONS_LIST,
              component: CollectionsView,
            },
            {
              path: ":name",
              name: ROUTE_NAME.DOCUMENTS,
              component: DataBrowserView,
            },
            {
              path: ":name/aggregation",
              name: ROUTE_NAME.AGGREGATION,
              component: AggregationView,
            },
          ],
        },
      ],
    },
    {
      path: "/connect",
      name: ROUTE_NAME.CONNECT,
      component: ConnectView,
    },
  ],
});
