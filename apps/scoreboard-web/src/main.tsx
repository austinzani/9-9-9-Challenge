import React from 'react';
import ReactDOM from 'react-dom/client';

import { Scoreboard } from '@challenge/scoreboard-ui';

import { INITIAL_GAME, INITIAL_PARTICIPANTS } from './mockData';
import './styles.css';

function App() {
  return (
    <div id="stage">
      <div id="phone-preview">
        <div className="phone-scroll">
          <Scoreboard
            participants={INITIAL_PARTICIPANTS}
            game={INITIAL_GAME}
            showTopHighlight
            qrUrl="999.austinzani.dev"
            connectionState="connected"
            topInset={54}
          />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
