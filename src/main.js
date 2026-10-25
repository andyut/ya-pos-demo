import { createApp } from 'vue'
import { Quasar, Notify, Dialog } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import App from './App.vue'
createApp(App).use(Quasar, { plugins: { Notify, Dialog }, config: { brand: { primary: '#127475', secondary: '#0d5556' } } }).mount('#app')
