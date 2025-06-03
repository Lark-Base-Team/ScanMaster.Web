import ReactDOM from 'react-dom'
import { I18nextProvider } from 'react-i18next';
import './App.css';
import App from './App';
import i18n from './locales/i18n';

i18n.init().then(() => {
    ReactDOM.render(
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>,
      document.getElementById('root')
    );
  });

