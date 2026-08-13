import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Catalog from "./pages/Catalog";
import CourseDetail from "./pages/CourseDetail";
import Home from "./pages/Home";
import InfoPage from "./pages/InfoPage";
import MyPage from "./pages/MyPage";
import NotFound from "./pages/NotFound";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/catalog" component={Catalog} />
    <Route path="/courses/:slug" component={CourseDetail} />
    <Route path="/mypage" component={MyPage} />
    <Route path="/for-doctors" component={InfoPage} />
    <Route path="/terms" component={InfoPage} />
    <Route path="/privacy" component={InfoPage} />
    <Route path="/commercial" component={InfoPage} />
    <Route path="/medical-disclaimer" component={InfoPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
