// src/main.jsx or wherever your main layout component is

import './App.css'; // Your base CSS
import store from './store/index.js';
import { Provider } from "react-redux";
import AppLayout from './AppLayout.jsx';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg);
    }).catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}

// Create a styled component or use sx for the spacer Box
// const ToolbarSpacer = styled(Box)(({ theme }) => theme.mixins.toolbar);
const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  </Provider>
);