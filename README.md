# BeizosGal 👄

**BeizosGal** é unha aplicación experimental de lectura de beizos impulsada por Intelixencia Artificial. Utiliza o modelo multimodal **Gemini 2.5 Pro** de Google para analizar o movemento dos beizos en clips de vídeo mudos e transcribir o que se está a dicir.

> 🌍 **Interfaz completamente en Galego.**

![BeizosGal Banner](https://via.placeholder.com/800x200?text=BeizosGal+|+Lectura+de+Beizos+con+IA)
*(Podes substituír esta imaxe por unha captura de pantalla real da aplicación)*

## ✨ Características

- 📹 **Análise de Vídeo Local:** Procesa vídeos directamente no navegador.
- ⏱️ **Selector de Tempo Preciso:** Permite escoller o fragmento exacto a analizar (recomendado < 3 segundos).
- ✂️ **Recorte Intelixente (Crop):** Ferramenta visual para enfocar a IA exclusivamente na boca do falante.
- 🧠 **IA Avanzada:** Utiliza `gemini-2.5-pro` para interpretar movementos labiais sutís.
- 🗣️ **Transcrición e Tradución:**
  - Soporte nativo para Galego, Castelán e Inglés.
  - **Auto-tradución:** Se se detecta outro idioma, ofrece a transcrición orixinal + tradución ao castelán.
- 🔊 **Texto a Voz (TTS):** Le a transcrición en voz alta usando a voz natural "Puck" de Gemini.

## 🚀 Instalación e Uso

### Prerrequisitos

- Node.js (v16+)
- Unha [API Key de Google Gemini](https://aistudio.google.com/)

### Pasos

1. **Clonar o repositorio:**
   ```bash
   git clone https://github.com/tonetxo/Maquina-de-leer-los-labios.git
   cd Maquina-de-leer-los-labios
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar a API Key:**
   Crea un ficheiro `.env.local` na raíz do proxecto e engade a túa clave:
   ```env
   VITE_API_KEY=a_tua_clave_de_api_aqui
   ```

4. **Arrancar o servidor de desenvolvemento:**
   ```bash
   npm run dev
   ```

## 🛠️ Tecnoloxías

- **Frontend:** React + TypeScript + Vite
- **Estilos:** Tailwind CSS
- **AI SDK:** Google Generative AI SDK (`@google/genai`)
- **Audio:** Web Audio API

## ⚠️ Nota Importante

A lectura de beizos por IA é unha tecnoloxía **experimental**. A precisión dos resultados depende enormemente de:
- A calidade e resolución do vídeo.
- Unha boa iluminación sobre o rostro.
- Que o falante estea de fronte e articule claramente.
- Un recorte (crop) preciso sobre a zona da boca.

---
Desenvolvido por [Tonetxo](https://github.com/tonetxo)