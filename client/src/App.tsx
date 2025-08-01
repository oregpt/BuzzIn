import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import GameLobby from "@/pages/game-lobby";
import GameSetup from "@/pages/game-setup-simple";
import GameHost from "@/pages/game-host-new";
import GamePlayer from "@/pages/game-player";

function Router() {
  return (
    <Switch>
      <Route path="/" component={GameLobby} />
      <Route path="/setup" component={GameSetup} />
      <Route path="/host" component={GameHost} />
      <Route path="/play" component={GamePlayer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
