import 'reflect-metadata';
import { initLogForwarder } from './api/logging';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import {isMobile} from "@/config/environment.ts";

// 가능한 한 빨리 초기화하여 초기 로그도 캡처
initLogForwarder();

// Detect mobile devices and scale up the zoom level for better readability
if (isMobile()) {
  document.documentElement.style.zoom = '1.25';

  // CSS zoom makes content larger than viewport, causing the browser to
  // force-scroll the html element when the virtual keyboard opens.
  // This keeps fixed-positioned elements (header, input) in place.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    window.visualViewport.addEventListener('scroll', () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
