import { createBrowserRouter } from "react-router";
import { RootLayout } from "./pages/RootLayout";
import { LandingPage } from "./pages/LandingPage";
import { PricingPage } from "./pages/PricingPage";
import { AgentsPage } from "./pages/AgentsPage";
import { HubPage } from "./pages/HubPage";
import { HubHistoryPage } from "./pages/HubHistoryPage";
import { ChatPage } from "./pages/ChatPage";
import { StudioHomePage } from "./pages/StudioHomePage";
import { StudioNewAssetPage } from "./pages/StudioNewAssetPage";
import { StudioAssetPage } from "./pages/StudioAssetPage";
import { StudioCampaignPage } from "./pages/StudioCampaignPage";
import { VaultPage } from "./pages/VaultPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminPage } from "./pages/AdminPage";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SettingsProfilePage } from "./pages/SettingsProfilePage";
import { SettingsBillingPage } from "./pages/SettingsBillingPage";
import { SettingsTeamPage } from "./pages/SettingsTeamPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: "pricing", Component: PricingPage },
      { path: "agents", Component: AgentsPage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: LoginPage },
      { path: "forgot-password", Component: ForgotPasswordPage },
      { path: "reset-password", Component: ResetPasswordPage },
      {
        Component: RequireAuth,
        children: [
          { path: "dashboard", Component: DashboardPage },
          { path: "hub", Component: HubPage },
          { path: "hub/history", Component: HubHistoryPage },
          { path: "chat", Component: ChatPage },
          { path: "studio/chat", Component: ChatPage },
          { path: "studio", Component: StudioHomePage },
          { path: "studio/new", Component: StudioNewAssetPage },
          { path: "studio/create", Component: StudioNewAssetPage },
          { path: "studio/asset/:assetId", Component: StudioAssetPage },
          { path: "studio/campaign/:campaignId", Component: StudioCampaignPage },
          { path: "studio/vault", Component: VaultPage },
          { path: "studio/campaigns", Component: CampaignsPage },
          { path: "studio/analytics", Component: AnalyticsPage },
          { path: "settings/profile", Component: SettingsProfilePage },
          { path: "settings/billing", Component: SettingsBillingPage },
          { path: "settings/team", Component: SettingsTeamPage },
        ],
      },
      {
        Component: RequireAdmin,
        children: [
          { path: "admin", Component: AdminPage },
          { path: "admin/users", Component: AdminPage },
          { path: "admin/revenue", Component: AdminPage },
          { path: "admin/usage", Component: AdminPage },
          { path: "admin/models", Component: AdminPage },
          { path: "admin/content", Component: AdminPage },
          { path: "admin/studio", Component: AdminPage },
          { path: "admin/logs", Component: AdminPage },
          { path: "admin/settings", Component: AdminPage },
          { path: "studio/admin", Component: AdminPage },
        ],
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
