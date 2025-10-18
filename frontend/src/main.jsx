import React from 'react'

import './App.css';
import store from './store/index.js';
import { Provider } from "react-redux";
import AppLayout from './AppLayout.jsx';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Setup axios (auth + logging interceptors)
import setupAxios from './utils/axiosAuth';
setupAxios();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg);
    }).catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <ErrorBoundary style={{ width: "100%", height: "10rem" }}>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </ErrorBoundary>
);
