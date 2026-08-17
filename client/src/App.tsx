import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import Catalog from "./pages/Catalog";
import CatalogAdmin from "./pages/CatalogAdmin";
import CourseDetail from "./pages/CourseDetail";
import Home from "./pages/Home";
import InfoPage from "./pages/InfoPage";
import MyPage from "./pages/MyPage";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import SubscriptionAccount from "./pages/SubscriptionAccount";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";

function PostLoginRedirect() {
  const { isAuthenticated, loading } = useAuth();
  useEffect(() => {
    if (loading || !isAuthenticated) return;
    const returnTo = window.sessionStorage.getItem("medivista_post_login_path");
    if (!returnTo) return;
    window.sessionStorage.removeItem("medivista_post_login_path");
    window.location.replace(returnTo);
  }, [isAuthenticated, loading]);
  return null;
}

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/catalog" component={Catalog} />
    <Route path="/admin/catalog" component={CatalogAdmin} />
    <Route path="/courses/:slug" component={CourseDetail} />
    <Route path="/mypage" component={MyPage} />
    <Route path="/pricing" component={Pricing} />
    <Route path="/account/subscription" component={SubscriptionAccount} />
    <Route path="/subscription/success" component={SubscriptionSuccess} />
    <Route path="/for-doctors" component={InfoPage} />
    <Route path="/terms" component={InfoPage} />
    <Route path="/privacy" component={InfoPage} />
    <Route path="/commercial" component={InfoPage} />
    <Route path="/help" component={InfoPage} />
    <Route path="/medical-disclaimer" component={InfoPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><PostLoginRedirect /><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
